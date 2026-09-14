import { IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @IsNotEmpty()
  tourId: number;

  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @IsString()
  @IsNotEmpty()
  bookingTime: string;

  @IsInt()
  @Min(1)
  numberOfGuests: number;
}
