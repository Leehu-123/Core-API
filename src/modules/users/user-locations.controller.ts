import { Body, Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('User Locations')
@Controller('user-locations')
@ApiBearerAuth('access-token')
// RolesGuard is not used here to allow all authenticated users (sales) to post their locations
export class UserLocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Save user location' })
  @ApiResponse({ status: 201, description: 'Location saved' })
  async saveLocation(
    @CurrentUser() user: JwtPayload,
    @Body() body: { latitude: number; longitude: number; accuracy?: number; timestamp?: Date },
  ) {
    return this.prisma.userLocation.create({
      data: {
        userId: user.sub,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user locations for a specific date' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  async getLocations(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    // date should be in YYYY-MM-DD format
    if (!userId || !date) {
      return [];
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.userLocation.findMany({
      where: {
        userId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }
}

