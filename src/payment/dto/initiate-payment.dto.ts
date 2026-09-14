import { IsInt, IsNotEmpty } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt()
  @IsNotEmpty()
  bookingId: number;
}
