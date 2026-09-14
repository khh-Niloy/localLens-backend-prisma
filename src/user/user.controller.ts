import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserUpdateDto } from './dto/userUpdate.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from 'src/generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAllUser();
  }

  @Get('profile')
  getProfile(@CurrentUser('id') userId: number) {
    return this.userService.getUserProfile(userId);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: number,
    @Body() updateUserDto: UserUpdateDto,
  ) {
    return this.userService.updateUser(userId, updateUserDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UserUpdateDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }
}
