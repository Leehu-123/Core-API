import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { configuration, validationSchema } from './config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards';
import { AuditLogService } from './common/services';
// Auth & System
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
// Stock Manager
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { LocationsModule } from './modules/locations/locations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { GoodsIssuesModule } from './modules/goods-issues/goods-issues.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { ProcessingOrdersModule } from './modules/processing-orders/processing-orders.module';
import { StocktakesModule } from './modules/stocktakes/stocktakes.module';
import { DamageReportsModule } from './modules/damage-reports/damage-reports.module';
import { StockAdjustmentsModule } from './modules/stock-adjustments/stock-adjustments.module';
// Sale Manager
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TeamsModule } from './modules/teams/teams.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { SalesTasksModule } from './modules/sales-tasks/sales-tasks.module';
import { CustomerInteractionsModule } from './modules/customer-interactions/customer-interactions.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { BusinessTripsModule } from './modules/business-trips/business-trips.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { ReportsModule } from './modules/reports/reports.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    // Auth & System
    AuthModule,
    UsersModule,
    CompaniesModule,
    RolesModule,
    PermissionsModule,
    AuditLogsModule,
    NotificationsModule,
    // Stock Manager
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    LocationsModule,
    InventoryModule,
    GoodsReceiptsModule,
    GoodsIssuesModule,
    StockMovementsModule,
    ProcessingOrdersModule,
    StocktakesModule,
    DamageReportsModule,
    StockAdjustmentsModule,
    // Sale Manager
    DashboardModule,
    TeamsModule,
    OpportunitiesModule,
    QuotesModule,
    SalesOrdersModule,
    SalesTasksModule,
    CustomerInteractionsModule,
    KpisModule,
    BusinessTripsModule,
    UploadModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AuditLogService,
  ],
  exports: [AuditLogService],
})
export class AppModule {}
