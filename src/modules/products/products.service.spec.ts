import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let auditLog: any;

  beforeEach(async () => {
    prisma = {
      product: {
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
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [{ id: '1', name: 'Test', sku: 'SKU-1' }];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll('company-1', { page: 1, limit: 20, skip: 0 } as any);
      expect(result.data).toEqual(mockProducts);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne('id', 'company-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create product and log audit', async () => {
      const dto = { sku: 'SKU-1', name: 'Test', costPrice: 100, salePrice: 150 };
      const created = { id: '1', ...dto, companyId: 'c1' };
      prisma.product.create.mockResolvedValue(created);

      const result = await service.create('c1', 'u1', dto as any);
      expect(result).toEqual(created);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATED', entity: 'Product' }),
      );
    });
  });

  describe('remove', () => {
    it('should set deletedAt on product', async () => {
      const existing = { id: '1', name: 'Test', companyId: 'c1', deletedAt: null };
      prisma.product.findFirst.mockResolvedValue(existing);
      prisma.product.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      const result = await service.remove('1', 'c1', 'u1');
      expect(result.deletedAt).toBeDefined();
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
