import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let auditLog: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    auditLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'nonexistent@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$12$invalidhashvalue',
        isActive: true,
        deletedAt: null,
        companyId: 'c1',
        userRoles: [],
      });

      await expect(
        service.login({ identifier: 'test@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$12$somehash',
        isActive: false,
        deletedAt: null,
        companyId: 'c1',
        userRoles: [],
      });

      await expect(
        service.login({ identifier: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
