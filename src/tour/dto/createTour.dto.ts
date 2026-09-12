import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TOUR_CATEGORY, TOUR_STATUS } from 'src/generated/prisma/enums';

export class CreateTourDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  guideId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsOptional()
  longDescription?: string;

  @IsOptional()
  itinerary?: any;

  @IsNumber()
  @Min(0, { message: 'Tour fee must be positive' })
  @Type(() => Number)
  tourFee: number;

  @IsInt()
  @Min(1, { message: 'Max duration must be at least 1 hour' })
  @Type(() => Number)
  maxDuration: number;

  @IsString()
  @IsNotEmpty({ message: 'Meeting point is required' })
  meetingPoint: string;

  @IsInt()
  @Min(1, { message: 'Max group size must be at least 1' })
  @Type(() => Number)
  maxGroupSize: number;

  @IsEnum(TOUR_CATEGORY, {
    message:
      'Category must be one of: FOOD, HISTORICAL, ART, NATURE, ADVENTURE, CULTURAL',
  })
  category: TOUR_CATEGORY;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  highlights?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  included?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notIncluded?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  importantInfo?: string[];

  @IsEnum(TOUR_STATUS)
  @IsOptional()
  status?: TOUR_STATUS;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  availableDates?: any;
}
