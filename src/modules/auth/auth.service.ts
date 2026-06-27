import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { LoginDto, RegisterInitialCompanyDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        entity: 'User',
        newValue: { identifier: dto.identifier, reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.auditLogService.log({
        companyId: user.companyId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        newValue: { reason: 'Account inactive' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditLogService.log({
        companyId: user.companyId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        newValue: { reason: 'Invalid password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    const token = this.generateToken(user.id, user.email || user.username || '', user.companyId);

    await this.auditLogService.log({
      companyId: user.companyId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId: user.companyId,
        roles,
        permissions,
      },
    };
  }

  async registerInitialCompany(dto: RegisterInitialCompanyDto) {
    // Check if company code already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { code: dto.companyCode },
    });
    if (existingCompany) {
      throw new ConflictException('Company code already exists');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create company, user, roles, and assign owner role in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          code: dto.companyCode,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
        },
      });

      // Get all permissions
      const allPermissions = await tx.permission.findMany();

      // Create default roles for this company
      const roleConfigs = [
        { name: 'owner', description: 'Company owner with full access', permissions: allPermissions.map(p => p.name) },
        { name: 'admin', description: 'Administrator with full access', permissions: allPermissions.map(p => p.name) },
        { name: 'sales', description: 'Sales staff', permissions: ['products.read', 'customers.read', 'customers.write'] },
        { name: 'warehouse', description: 'Warehouse staff', permissions: ['products.read', 'products.write'] },
        { name: 'viewer', description: 'Read-only access', permissions: allPermissions.filter(p => p.name.endsWith('.read')).map(p => p.name) },
      ];

      let ownerRole;
      for (const roleConfig of roleConfigs) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            name: roleConfig.name,
            description: roleConfig.description,
            isSystem: true,
          },
        });

        // Assign permissions to role
        const rolePerms = allPermissions.filter(p => roleConfig.permissions.includes(p.name));
        for (const perm of rolePerms) {
          await tx.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }

        if (roleConfig.name === 'owner') {
          ownerRole = role;
        }
      }

      // Assign owner role to user
      if (ownerRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: ownerRole.id,
          },
        });
      }

      return { company, user };
    });

    const token = this.generateToken(result.user.id, result.user.email || result.user.username || '', result.company.id);

    return {
      accessToken: token,
      company: {
        id: result.company.id,
        name: result.company.name,
        code: result.company.code,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        code: user.company.code,
      },
      roles,
      permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async refreshToken(userId: string, email: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    const token = this.generateToken(userId, email, companyId);
    return { accessToken: token };
  }

  private generateToken(userId: string, email: string, companyId: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      companyId,
    });
  }
}
