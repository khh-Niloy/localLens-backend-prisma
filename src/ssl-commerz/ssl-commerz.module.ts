import { Module } from '@nestjs/common';
import { SslCommerzService } from './ssl-commerz.service';

@Module({
  providers: [SslCommerzService],
  exports: [SslCommerzService],
})
export class SslCommerzModule {}
