import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: any;
  let auditLog: any;

  beforeEach(async () => {
    prisma = {
      customer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [{ id: '1', name: 'Acme Corp', code: 'CUST-001' }];
      prisma.customer.findMany.mockResolvedValue(mockCustomers);
      prisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll('company-1', { page: 1, limit: 20, skip: 0 } as any);
      expect(result.data).toEqual(mockCustomers);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.findOne('id', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should return customer when found', async () => {
      const mockCustomer = { id: '1', name: 'Acme Corp', companyId: 'company-1', deletedAt: null };
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.findOne('1', 'company-1');
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('create', () => {
    it('should create customer and log audit', async () => {
      const dto = { code: 'CUST-001', name: 'Acme Corp' };
      const created = { id: '1', ...dto, companyId: 'c1' };
      prisma.customer.create.mockResolvedValue(created);

      const result = await service.create('c1', 'u1', dto as any);
      expect(result).toEqual(created);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATED', entity: 'Customer' }),
      );
    });
  });
});
