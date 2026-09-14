import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BOOKING_STATUS } from '../../generated/prisma/enums';

export class UpdateBookingStatusDto {
  @IsEnum(BOOKING_STATUS)
  status: BOOKING_STATUS;

  @IsString()
  @IsOptional()
  note?: string;
}
