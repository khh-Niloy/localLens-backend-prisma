import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/enums';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Tourist: create a booking
  @UseGuards(RolesGuard)
  @Roles(Role.TOURIST)
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() currentUser: any) {
    return this.bookingService.createBooking(dto, currentUser);
  }

  // Tourist + Guide: get own bookings
  @UseGuards(RolesGuard)
  @Roles(Role.TOURIST, Role.GUIDE)
  @Get('my-bookings')
  getMyBookings(@CurrentUser() currentUser: any) {
    return this.bookingService.getMyBookings(currentUser);
  }

  // Admin: get all bookings with filters
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  getAllBookings(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.getAllBookings({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // Tourist + Guide + Admin: get single booking (access-checked in service)
  @Get(':id')
  getBookingById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.bookingService.getBookingById(id, currentUser);
  }

  // ONE handler for all status updates (ACCEPTED, PAYMENT_PENDING, COMPLETED, CANCELLED, FAILED)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GUIDE)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.bookingService.updateBookingStatus(id, dto, currentUser);
  }
}
