import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserCreateDto } from './dto/userCreate.dto';
import { UserUpdateDto } from './dto/userUpdate.dto';
import { Role } from 'src/generated/prisma/enums';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(createUserDto: UserCreateDto, role: Role) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const { role: dtoRole, ...data } = createUserDto;

    return this.prisma.user.create({
      data: {
        ...data,
        role: role ?? dtoRole ?? Role.TOURIST,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isActive: true,
        isDeleted: true,
        isBlocked: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllUser() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isActive: true,
        isDeleted: true,
        isBlocked: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isActive: true,
        isDeleted: true,
        isBlocked: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUser(id: number, updateUserDto: UserUpdateDto) {
    await this.findUserById(id);

    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'Email is already in use by another account',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isActive: true,
        isDeleted: true,
        isBlocked: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: number) {
    await this.findUserById(id);

    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDeleted: true,
      },
    });
  }
}
