import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserCreateDto } from './dto/userCreate.dto';
import { UserUpdateDto } from './dto/userUpdate.dto';
import { Role } from 'src/generated/prisma/enums';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('tourist')
  createTourist(@Body() createUserDto: UserCreateDto) {
    return this.userService.createUser(createUserDto, Role.TOURIST);
  }

  @Post('guide')
  createGuide(@Body() createUserDto: UserCreateDto) {
    return this.userService.createUser(createUserDto, Role.GUIDE);
  }

  @Post('admin')
  createAdmin(@Body() createUserDto: UserCreateDto) {
    return this.userService.createUser(createUserDto, Role.ADMIN);
  }

  @Get()
  findAll() {
    return this.userService.findAllUser();
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

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }
}
