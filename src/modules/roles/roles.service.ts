import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.role.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(companyId: string, dto: AssignRoleDto) {
    // Verify user belongs to company
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID "${dto.userId}" not found in this company`,
      );
    }

    // Find role by name and companyId
    const role = await this.prisma.role.findFirst({
      where: { name: dto.roleName, companyId },
    });
    if (!role) {
      throw new NotFoundException(
        `Role "${dto.roleName}" not found for this company`,
      );
    }

    // Check if already assigned
    const existing = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, roleId: role.id },
    });
    if (existing) {
      throw new ConflictException(
        `Role "${dto.roleName}" is already assigned to this user`,
      );
    }

    await this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: role.id,
      },
    });

    return { message: `Role "${dto.roleName}" assigned successfully` };
  }

  async removeRole(companyId: string, dto: AssignRoleDto) {
    // Verify user belongs to company
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID "${dto.userId}" not found in this company`,
      );
    }

    // Find role by name and companyId
    const role = await this.prisma.role.findFirst({
      where: { name: dto.roleName, companyId },
    });
    if (!role) {
      throw new NotFoundException(
        `Role "${dto.roleName}" not found for this company`,
      );
    }

    // Find the user-role assignment
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, roleId: role.id },
    });
    if (!userRole) {
      throw new NotFoundException(
        `Role "${dto.roleName}" is not assigned to this user`,
      );
    }

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    return { message: `Role "${dto.roleName}" removed successfully` };
  }
}
