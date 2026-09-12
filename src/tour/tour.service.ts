import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTourDto } from './dto/createTour.dto';
import { UpdateTourDto } from './dto/updateTour.dto';
import { Role, TOUR_CATEGORY } from 'src/generated/prisma/enums';

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) {}

  async createTour(createTourDto: CreateTourDto, currentUser?: any) {
    const guideId = createTourDto.guideId ?? currentUser?.id;

    if (!guideId) {
      throw new BadRequestException('A valid guideId is required');
    }

    const guide = await this.prisma.user.findUnique({
      where: { id: guideId },
    });

    if (!guide || guide.isDeleted || !guide.isActive || guide.isBlocked) {
      throw new NotFoundException('Assigned guide not found or inactive');
    }

    const slug = createTourDto.slug
      ? createTourDto.slug.toLowerCase().trim()
      : this.generateSlug(createTourDto.title);

    const existingTour = await this.prisma.tour.findUnique({
      where: { slug },
    });

    if (existingTour) {
      throw new ConflictException(`Tour with slug "${slug}" already exists`);
    }

    return this.prisma.tour.create({
      data: {
        ...createTourDto,
        guideId,
        slug,
      },
      include: {
        guide: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
  }

  async findAllTours(params: {
    category?: string;
    location?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, location, active, search, page = 1, limit = 10 } = params;

    const where: any = {};

    if (category) {
      where.category = category as TOUR_CATEGORY;
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guide: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return {
      data: tours,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTourBySlug(slug: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      include: {
        guide: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException(`Tour with slug "${slug}" not found`);
    }

    return tour;
  }

  async findTourById(id: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        guide: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }

    return tour;
  }

  async updateTour(id: number, updateTourDto: UpdateTourDto, currentUser?: any) {
    const tour = await this.findTourById(id);

    if (
      currentUser &&
      currentUser.role === Role.GUIDE &&
      tour.guideId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only update your own tours');
    }

    if (updateTourDto.slug && updateTourDto.slug !== tour.slug) {
      const existingTour = await this.prisma.tour.findUnique({
        where: { slug: updateTourDto.slug },
      });
      if (existingTour) {
        throw new ConflictException(
          `Tour with slug "${updateTourDto.slug}" already exists`,
        );
      }
    }

    return this.prisma.tour.update({
      where: { id },
      data: updateTourDto,
      include: {
        guide: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
  }

  async deleteTour(id: number, currentUser?: any) {
    const tour = await this.findTourById(id);

    if (
      currentUser &&
      currentUser.role === Role.GUIDE &&
      tour.guideId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only delete your own tours');
    }

    return this.prisma.tour.delete({
      where: { id },
    });
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${base}-${randomSuffix}`;
  }
}
