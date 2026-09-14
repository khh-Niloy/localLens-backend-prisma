import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/createTour.dto';
import { UpdateTourDto } from './dto/updateTour.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from 'src/generated/prisma/enums';

@Controller('tour')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GUIDE, Role.ADMIN)
  @Post()
  create(
    @Body() createTourDto: CreateTourDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.tourService.createTour(createTourDto, currentUser);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tourService.findAllTours({
      category,
      location,
      active: active !== undefined ? active === 'true' : undefined,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tourService.findTourBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tourService.findTourById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GUIDE, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTourDto: UpdateTourDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.tourService.updateTour(id, updateTourDto, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GUIDE, Role.ADMIN)
  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.tourService.deleteTour(id, currentUser);
  }
}
