import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SslCommerzService } from '../ssl-commerz/ssl-commerz.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  Role,
} from '../generated/prisma/enums';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sslCommerz: SslCommerzService,
    private readonly config: ConfigService,
  ) {}

  // ─── Tourist: Initiate payment ────────────────────────────────────────────────
  // Creates a Payment record (UNPAID) and returns the SSLCommerz GatewayPageURL
  async initiatePayment(dto: InitiatePaymentDto, currentUser: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== currentUser.id) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }

    const payableStatuses: BOOKING_STATUS[] = [
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.PAYMENT_PENDING,
    ];

    if (!payableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Booking must be in ACCEPTED or PAYMENT_PENDING status. Current: ${booking.status}`,
      );
    }

    // Prevent duplicate payment
    if (booking.payment && booking.payment.status === PAYMENT_STATUS.PAID) {
      throw new BadRequestException('This booking has already been paid');
    }

    // Reuse existing transactionId if payment record exists (e.g. previous fail/cancel)
    const transactionId =
      booking.payment?.transactionId ?? `TXN-${randomUUID().toUpperCase()}`;

    // Create or reuse payment record
    if (!booking.payment) {
      await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          transactionId,
          amount: booking.totalAmount,
          status: PAYMENT_STATUS.UNPAID,
        },
      });
    }

    // Call SSLCommerz — returns GatewayPageURL for frontend redirect
    const sslResponse = await this.sslCommerz.initPayment({
      amount: booking.totalAmount,
      transactionId,
      name: booking.user.name,
      email: booking.user.email,
      phoneNumber: booking.user.phone,
      address: booking.user.address,
    });

    return {
      paymentUrl: sslResponse.GatewayPageURL,
      transactionId,
      bookingId: booking.id,
      amount: booking.totalAmount,
    };
  }

  // ─── SSLCommerz Callback: Success ─────────────────────────────────────────────
  // SSLCommerz redirects user here after successful payment
  async handleSuccess(query: Record<string, string>) {
    const { transactionId } = query;

    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Atomic: update payment PAID + booking CONFIRMED
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { transactionId },
        data: {
          status: PAYMENT_STATUS.PAID,
          paidAt: new Date(),
          paymentGatewayData: query as any,
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BOOKING_STATUS.CONFIRMED },
      }),
    ]);

    // Redirect to frontend success page
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    return `${frontendUrl}/payment/success?bookingId=${payment.bookingId}`;
  }

  // ─── SSLCommerz Callback: Fail ────────────────────────────────────────────────
  async handleFail(query: Record<string, string>) {
    const { transactionId } = query;

    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { transactionId },
        data: {
          status: PAYMENT_STATUS.FAILED,
          paymentGatewayData: query as any,
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BOOKING_STATUS.FAILED },
      }),
    ]);

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    return `${frontendUrl}/payment/fail?bookingId=${payment.bookingId}`;
  }

  // ─── SSLCommerz Callback: Cancel ─────────────────────────────────────────────
  async handleCancel(query: Record<string, string>) {
    const { transactionId } = query;

    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { transactionId },
        data: {
          status: PAYMENT_STATUS.CANCELLED,
          paymentGatewayData: query as any,
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BOOKING_STATUS.CANCELLED },
      }),
    ]);

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    return `${frontendUrl}/payment/cancel?bookingId=${payment.bookingId}`;
  }

  // ─── Get payment by booking ID ────────────────────────────────────────────────
  async getPaymentByBookingId(bookingId: number, currentUser: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isAdmin = currentUser.role === Role.ADMIN;
    const isTouristOwner =
      currentUser.role === Role.TOURIST && booking.userId === currentUser.id;
    const isAssignedGuide =
      currentUser.role === Role.GUIDE && booking.guideId === currentUser.id;

    if (!isAdmin && !isTouristOwner && !isAssignedGuide) {
      throw new ForbiddenException(
        'You do not have access to this payment record',
      );
    }

    if (!booking.payment) {
      throw new NotFoundException('No payment found for this booking');
    }

    return booking.payment;
  }
}
