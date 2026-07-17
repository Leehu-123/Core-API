import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getReport(
    companyId: string,
    type: string,
    userIdFilter?: string,
    startDate?: string,
    endDate?: string,
    userRole?: string,
    userId?: string
  ) {
    const isSalesOnly = userRole === 'SALES';
    // If the user is SALES, they can only see their own data, otherwise they can filter
    const targetUserId = isSalesOnly ? userId : userIdFilter;
    
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else {
      // Default to last 6 months for most reports if not specified
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      dateFilter = { gte: sixMonthsAgo };
    }

    switch (type) {
      case 'revenue':
        return this.getRevenueReport(companyId, targetUserId, dateFilter);
      case 'pipeline':
        return this.getPipelineReport(companyId, targetUserId, dateFilter);
      case 'sources':
        return this.getSourcesReport(companyId, targetUserId, dateFilter);
      case 'products':
        return this.getProductsReport(companyId, targetUserId, dateFilter);
      case 'receivables':
        return this.getReceivablesReport(companyId, targetUserId); // date filter usually doesn't apply to current receivables
      case 'users':
        if (isSalesOnly) return { data: [] }; // Sales shouldn't see other users
        return this.getUsersReport(companyId, dateFilter);
      default:
        return { error: 'Invalid report type' };
    }
  }

  private async getRevenueReport(companyId: string, userId: string | undefined, dateFilter: any) {
    const orderWhere: any = { companyId, deletedAt: null, status: { not: 'CANCELLED' } };
    if (userId) orderWhere.assignedToId = userId;
    
    // For revenue chart, we ignore the main dateFilter and always show the last 6 months
    // but we can respect it if it's a specific month filter
    let useDateFilter = dateFilter;
    let monthsToProcess = 6;
    let endDate = new Date();
    
    if (dateFilter.lte && dateFilter.gte) {
      // If a specific month was selected, we just show that month
      useDateFilter = dateFilter;
      monthsToProcess = 1;
      endDate = new Date(dateFilter.lte);
    }

    orderWhere.createdAt = useDateFilter;

    const orders = await this.prisma.salesOrder.findMany({
      where: orderWhere
    });

    let total = 0;
    let totalPaid = 0;
    
    orders.forEach(o => {
      total += o.total;
      totalPaid += o.paidAmount;
    });

    const data = [];
    for (let i = monthsToProcess - 1; i >= 0; i--) {
      const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const nextMonth = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 1);
      const monthStr = `T${d.getMonth() + 1}`;
      
      const monthOrders = orders.filter(o => o.createdAt >= d && o.createdAt < nextMonth);
      let rev = 0, paid = 0;
      monthOrders.forEach(o => { rev += o.total; paid += o.paidAmount; });
      data.push({ month: monthStr, revenue: rev, paid });
    }

    return { total, totalPaid, data };
  }

  private async getPipelineReport(companyId: string, userId: string | undefined, dateFilter: any) {
    const oppWhere: any = { companyId, deletedAt: null, createdAt: dateFilter };
    if (userId) oppWhere.assignedToId = userId;

    const stages = ['NEW_LEAD', 'CONTACTED', 'SURVEYED', 'CONSULTING', 'QUOTE_SENT', 'NEGOTIATING', 'CONTRACT_PENDING', 'WON', 'LOST'];
    const data = [];
    const productQuantities: Record<string, number> = {};

    for (const stage of stages) {
      const opps = await this.prisma.opportunity.findMany({
        where: { ...oppWhere, stage }
      });

      opps.forEach(o => {
        if (o.products) {
          try {
            const prods = JSON.parse(o.products);
            if (Array.isArray(prods)) {
              prods.forEach(p => {
                if (p.productId && p.quantity) {
                  productQuantities[p.productId] = (productQuantities[p.productId] || 0) + Number(p.quantity);
                }
              });
            }
          } catch (e) {}
        }
      });

      data.push({
        stage,
        count: opps.length,
        value: opps.reduce((sum, o) => sum + o.estimatedValue, 0)
      });
    }

    const productIds = Object.keys(productQuantities);
    let productsData: any[] = [];
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, code: true, name: true }
      });
      productsData = products.map(p => ({
        code: p.code || 'N/A',
        name: p.name,
        quantity: productQuantities[p.id] || 0
      })).sort((a, b) => b.quantity - a.quantity);
    }

    return { data, productsData };
  }

  private async getSourcesReport(companyId: string, userId: string | undefined, dateFilter: any) {
    const custWhere: any = { companyId, deletedAt: null, createdAt: dateFilter };
    if (userId) custWhere.assignedToId = userId;

    const customers = await this.prisma.customer.findMany({
      where: custWhere
    });

    const sourceMap = new Map<string, number>();
    customers.forEach(c => {
      const src = c.source || 'OTHER';
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    });

    const data = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));
    return { data };
  }

  private async getProductsReport(companyId: string, userId: string | undefined, dateFilter: any) {
    const orderWhere: any = { companyId, deletedAt: null, status: { not: 'CANCELLED' }, createdAt: dateFilter };
    if (userId) orderWhere.assignedToId = userId;

    const orders = await this.prisma.salesOrder.findMany({
      where: orderWhere,
      include: { items: { include: { product: true } } }
    });

    const productMap = new Map<string, { name: string; revenue: number; count: number }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          const existing = productMap.get(item.product.id) || { name: `${item.product.code} - ${item.product.name}`, revenue: 0, count: 0 };
          existing.revenue += item.total;
          existing.count += item.quantity;
          productMap.set(item.product.id, existing);
        }
      });
    });

    const data = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return { data };
  }

  private async getReceivablesReport(companyId: string, userId: string | undefined) {
    const orderWhere: any = { companyId, deletedAt: null, status: { not: 'CANCELLED' }, paymentStatus: { not: 'FULLY_PAID' }, remainingAmount: { gt: 0 } };
    if (userId) orderWhere.assignedToId = userId;

    const orders = await this.prisma.salesOrder.findMany({
      where: orderWhere,
      include: { customer: true, assignedTo: true }
    });

    const data = orders.map(o => ({
      code: o.code,
      customer: o.customer ? o.customer.name : 'Khách lẻ',
      total: o.total,
      paid: o.paidAmount,
      remaining: o.remainingAmount,
      assignedTo: o.assignedTo ? o.assignedTo.fullName : ''
    }));

    const totalReceivable = data.reduce((sum, item) => sum + item.remaining, 0);

    return { totalReceivable, data };
  }

  private async getUsersReport(companyId: string, dateFilter: any) {
    const users = await this.prisma.user.findMany({ where: { companyId, deletedAt: null } });
    const orders = await this.prisma.salesOrder.findMany({
      where: { companyId, deletedAt: null, status: { not: 'CANCELLED' }, createdAt: dateFilter }
    });

    const data = [];
    for (const u of users) {
      const uOrders = orders.filter(o => o.assignedToId === u.id);
      if (uOrders.length > 0) {
        data.push({
          name: u.fullName,
          revenue: uOrders.reduce((sum, o) => sum + o.total, 0),
          orders: uOrders.length
        });
      }
    }
    
    data.sort((a, b) => b.revenue - a.revenue);
    return { data };
  }
}
