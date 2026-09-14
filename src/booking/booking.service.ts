import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BOOKING_STATUS, Role } from '../generated/prisma/enums';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Tourist: Create a booking ───────────────────────────────────────────────
  async createBooking(dto: CreateBookingDto, currentUser: any) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: dto.tourId },
    });

    if (!tour || !tour.active) {
      throw new NotFoundException('Tour not found or is inactive');
    }

    const guide = await this.prisma.user.findUnique({
      where: { id: tour.guideId },
    });

    if (!guide || guide.isDeleted || !guide.isActive || guide.isBlocked) {
      throw new NotFoundException('Guide for this tour is not available');
    }

    const totalAmount = tour.tourFee * dto.numberOfGuests;

    return this.prisma.booking.create({
      data: {
        userId: currentUser.id,
        tourId: dto.tourId,
        guideId: tour.guideId,
        bookingDate: new Date(dto.bookingDate),
        bookingTime: dto.bookingTime,
        numberOfGuests: dto.numberOfGuests,
        totalAmount,
        status: BOOKING_STATUS.PENDING,
      },
      include: this.bookingIncludes(),
    });
  }

  // ─── Tourist / Guide: Get own bookings ───────────────────────────────────────
  async getMyBookings(currentUser: any) {
    const where =
      currentUser.role === Role.GUIDE
        ? { guideId: currentUser.id }
        : { userId: currentUser.id };

    return this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.bookingIncludes(),
    });
  }

  // ─── Admin: Get all bookings ──────────────────────────────────────────────────
  async getAllBookings(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 10 } = params;
    const where: any = {};

    if (status) {
      where.status = status as BOOKING_STATUS;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.bookingIncludes(),
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get single booking ───────────────────────────────────────────────────────
  async getBookingById(id: number, currentUser: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.bookingIncludes(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control: tourist must own it, guide must be assigned, admin sees all
    const isAdmin = currentUser.role === Role.ADMIN;
    const isTouristOwner = currentUser.role === Role.TOURIST && booking.userId === currentUser.id;
    const isAssignedGuide = currentUser.role === Role.GUIDE && booking.guideId === currentUser.id;

    if (!isAdmin && !isTouristOwner && !isAssignedGuide) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  // ─── ONE handler for all status updates ──────────────────────────────────────
  async updateBookingStatus(
    id: number,
    dto: UpdateBookingStatusDto,
    currentUser: any,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    this.validateTransition(booking, dto, currentUser);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note ? { note: dto.note } : {}),
      },
      include: this.bookingIncludes(),
    });
  }

  // ─── State machine validation ─────────────────────────────────────────────────
  private validateTransition(
    booking: any,
    dto: UpdateBookingStatusDto,
    currentUser: any,
  ) {
    const { status: current } = booking;
    const { status: next, note } = dto;
    const role = currentUser.role as Role;

    // Define allowed transitions per role
    const allowedTransitions: Record<string, Record<string, Role[]>> = {
      [BOOKING_STATUS.PENDING]: {
        [BOOKING_STATUS.ACCEPTED]: [Role.GUIDE, Role.ADMIN],
        [BOOKING_STATUS.CANCELLED]: [Role.GUIDE, Role.ADMIN],
      },
      [BOOKING_STATUS.ACCEPTED]: {
        [BOOKING_STATUS.PAYMENT_PENDING]: [Role.GUIDE, Role.ADMIN],
        [BOOKING_STATUS.CANCELLED]: [Role.GUIDE, Role.ADMIN, Role.TOURIST],
      },
      [BOOKING_STATUS.PAYMENT_PENDING]: {
        // CONFIRMED is triggered by PaymentService after successful payment, not here directly
        [BOOKING_STATUS.CANCELLED]: [Role.GUIDE, Role.ADMIN, Role.TOURIST],
        [BOOKING_STATUS.FAILED]: [Role.GUIDE, Role.ADMIN],
      },
      [BOOKING_STATUS.CONFIRMED]: {
        [BOOKING_STATUS.COMPLETED]: [Role.GUIDE, Role.ADMIN],
        [BOOKING_STATUS.CANCELLED]: [Role.GUIDE, Role.ADMIN],
      },
    };

    const allowedRoles = allowedTransitions[current]?.[next];

    if (!allowedRoles) {
      throw new BadRequestException(
        `Transition from ${current} to ${next} is not allowed`,
      );
    }

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `Your role (${role}) cannot transition booking from ${current} to ${next}`,
      );
    }

    // Guide and Admin must provide a note when cancelling or marking as failed
    if (
      (next === BOOKING_STATUS.CANCELLED || next === BOOKING_STATUS.FAILED) &&
      (role === Role.GUIDE || role === Role.ADMIN) &&
      !note
    ) {
      throw new BadRequestException(
        `A note is required when ${next.toLowerCase()} a booking`,
      );
    }

    // Only assigned guide (or admin) can act on this booking
    if (role === Role.GUIDE && booking.guideId !== currentUser.id) {
      throw new ForbiddenException('You are not the guide for this booking');
    }

    // Tourist can only cancel their own booking
    if (role === Role.TOURIST && booking.userId !== currentUser.id) {
      throw new ForbiddenException('You do not own this booking');
    }
  }

  // ─── Reusable include clause ──────────────────────────────────────────────────
  private bookingIncludes() {
    return {
      tour: {
        select: {
          id: true,
          title: true,
          slug: true,
          tourFee: true,
          location: true,
          images: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      guide: {
        select: { id: true, name: true, email: true, image: true },
      },
      payment: true,
    };
  }
}
