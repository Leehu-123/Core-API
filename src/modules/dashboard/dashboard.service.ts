import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(companyId: string, userId?: string, roles?: string[]) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const isSalesOnly = roles && roles.length === 1 && roles[0] === 'SALES';
    const userFilter = isSalesOnly && userId ? { assignedToId: userId } : {};
    
    // Revenue stats
    const ordersThisMonth = await this.prisma.salesOrder.findMany({
      where: { companyId, deletedAt: null, createdAt: { gte: firstDayOfMonth }, status: { not: 'CANCELLED' }, ...userFilter }
    });
    
    let totalRevenue = 0;
    let paidRevenue = 0;
    let unpaidRevenue = 0;
    
    ordersThisMonth.forEach(order => {
      totalRevenue += order.total;
      paidRevenue += order.paidAmount;
      unpaidRevenue += order.remainingAmount;
    });

    // Customers
    const customerWhere: any = { companyId, deletedAt: null, createdAt: { gte: firstDayOfMonth } };
    if (isSalesOnly && userId) customerWhere.assignedToId = userId;
    const newCustomers = await this.prisma.customer.count({ where: customerWhere });

    // Opportunities
    const oppWhere: any = { companyId, deletedAt: null, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } };
    if (isSalesOnly && userId) oppWhere.assignedToId = userId;
    const activeOpportunitiesList = await this.prisma.opportunity.findMany({ where: oppWhere });
    const activeOpportunities = activeOpportunitiesList.length;
    const pipelineValue = activeOpportunitiesList.reduce((sum, opp) => sum + opp.estimatedValue, 0);

    // Quotes
    const quoteWhere: any = { companyId, deletedAt: null };
    if (isSalesOnly && userId) quoteWhere.createdById = userId;
    const quoteSent = await this.prisma.quote.count({ where: { ...quoteWhere, status: 'SENT' } });
    const quotesPending = await this.prisma.quote.count({ where: { ...quoteWhere, status: 'DRAFT' } });

    // Close Rate (this month)
    const closeWhere: any = { companyId, deletedAt: null, updatedAt: { gte: firstDayOfMonth } };
    if (isSalesOnly && userId) closeWhere.assignedToId = userId;
    const closedWon = await this.prisma.opportunity.count({
      where: { ...closeWhere, stage: 'CLOSED_WON' }
    });
    const closedTotal = await this.prisma.opportunity.count({
      where: { ...closeWhere, stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] } }
    });
    const closeRate = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0;

    // Tasks
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const taskWhere: any = { companyId, status: { notIn: ['DONE', 'COMPLETED', 'CANCELLED'] } };
    if (isSalesOnly && userId) taskWhere.assignedToId = userId;
    
    const tasksDueToday = await this.prisma.salesTask.count({
      where: { ...taskWhere, dueDate: { gte: todayStart, lt: tomorrowStart } }
    });
    const tasksOverdue = await this.prisma.salesTask.count({
      where: { ...taskWhere, dueDate: { lt: todayStart } }
    });

    const followUpWhere: any = { companyId, deletedAt: null, nextFollowUpDate: { lte: now } };
    if (isSalesOnly && userId) followUpWhere.assignedToId = userId;
    const customersNeedFollowUp = await this.prisma.customer.count({ where: followUpWhere });

    // Revenue by month (last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = `T${d.getMonth() + 1}`;
      
      const orders = await this.prisma.salesOrder.findMany({
        where: { companyId, deletedAt: null, createdAt: { gte: d, lt: nextMonth }, status: { not: 'CANCELLED' }, ...userFilter }
      });
      let rev = 0, paid = 0;
      orders.forEach(o => { rev += o.total; paid += o.paidAmount; });
      revenueByMonth.push({ month: monthStr, revenue: rev, paid });
    }

    // Pipeline by stage
    const stages = ['NEW_LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    const pipelineByStage = [];
    for (const stage of stages) {
      const opps = await this.prisma.opportunity.findMany({
        where: { companyId, deletedAt: null, stage }
      });
      pipelineByStage.push({
        stage,
        count: opps.length,
        value: opps.reduce((sum, o) => sum + o.estimatedValue, 0)
      });
    }

    // Top Products
    const topProducts: Array<{ name: string; revenue: number; count: number }> = [];
    
    // Revenue by user
    const users = await this.prisma.user.findMany({ where: { companyId, deletedAt: null } });
    const revenueByUser = [];
    for (const u of users) {
      const uOrders = ordersThisMonth.filter(o => o.assignedToId === u.id);
      if (uOrders.length > 0) {
        revenueByUser.push({
          name: u.fullName,
          revenue: uOrders.reduce((sum, o) => sum + o.total, 0)
        });
      }
    }
    revenueByUser.sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      newCustomers,
      activeOpportunities,
      pipelineValue,
      quoteSent,
      quotesPending,
      closeRate,
      tasksDueToday,
      tasksOverdue,
      customersNeedFollowUp,
      revenueByMonth,
      pipelineByStage,
      topProducts,
      revenueByUser
    };
  }
}
