import { Controller, Get, Patch, Param, Body, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  async getAllUsers(@Query('role') role?: Role) {
    return this.usersService.findAllUsers(role);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean
  ) {
    return this.usersService.updateStatus(id, isActive);
  }
}
