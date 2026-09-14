import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/enums';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Tourist: initiate payment → returns GatewayPageURL
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TOURIST)
  @Post('initiate')
  initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.paymentService.initiatePayment(dto, currentUser);
  }

  // SSLCommerz redirects user here on success (supports both GET and POST)
  @Get('success')
  @Redirect()
  async successGet(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleSuccess(query);
    return { url };
  }

  @Post('success')
  @Redirect()
  async successPost(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleSuccess(query);
    return { url };
  }

  // SSLCommerz redirects user here on payment failure
  @Get('fail')
  @Redirect()
  async failGet(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleFail(query);
    return { url };
  }

  @Post('fail')
  @Redirect()
  async failPost(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleFail(query);
    return { url };
  }

  // SSLCommerz redirects user here on payment cancel
  @Get('cancel')
  @Redirect()
  async cancelGet(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleCancel(query);
    return { url };
  }

  @Post('cancel')
  @Redirect()
  async cancelPost(@Query() query: Record<string, string>) {
    const url = await this.paymentService.handleCancel(query);
    return { url };
  }

  // Tourist / Guide / Admin: get payment details for a booking
  @UseGuards(JwtAuthGuard)
  @Get(':bookingId')
  getPayment(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.paymentService.getPaymentByBookingId(bookingId, currentUser);
  }
}
