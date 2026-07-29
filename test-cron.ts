import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CronsService } from './src/modules/crons/crons.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const cronsService = app.get(CronsService);

  console.log('Finding admin user...');
  const admin = await prisma.user.findFirst({
    where: { telegramChatId: { not: null } },
  });

  if (!admin) {
    console.log('No admin with telegramChatId found!');
  } else {
    console.log(`Found admin: ${admin.fullName} (${admin.id}). Triggering cron...`);
    await cronsService.runDailyReminderLogic(admin.id);
    console.log('Cron triggered successfully!');
  }

  await app.close();
}

bootstrap();
