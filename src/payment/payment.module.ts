import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SslCommerzModule } from '../ssl-commerz/ssl-commerz.module';

@Module({
  imports: [PrismaModule, AuthModule, SslCommerzModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
