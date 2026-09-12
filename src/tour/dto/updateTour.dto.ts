import { PartialType } from '@nestjs/mapped-types';
import { CreateTourDto } from './createTour.dto';

export class UpdateTourDto extends PartialType(CreateTourDto) {}
