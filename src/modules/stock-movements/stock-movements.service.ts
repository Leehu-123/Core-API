import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface MovementData {
  companyId: string;
  type: string;
  refType: string;
  refId: string;
  productId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity: number;
  statusBefore?: string | null;
  statusAfter?: string | null;
  note?: string | null;
  createdById: string;
}

@Injectable()
export class StockMovementsService {
  async applyMovement(tx: Prisma.TransactionClient, data: MovementData) {
    // 1. Create the stock movement record
    const movement = await tx.stockMovement.create({
      data: {
        companyId: data.companyId,
        type: data.type,
        refType: data.refType,
        refId: data.refId,
        productId: data.productId,
        fromLocationId: data.fromLocationId || null,
        toLocationId: data.toLocationId || null,
        quantity: data.quantity,
        statusBefore: data.statusBefore || null,
        statusAfter: data.statusAfter || null,
        note: data.note || null,
        createdById: data.createdById,
      },
    });

    // 2. Decrease inventory at source (if fromLocationId is specified)
    if (data.fromLocationId) {
      const sourceStatus = data.statusBefore || 'tot';
      const existing = await tx.inventory.findUnique({
        where: {
          companyId_productId_locationId_status: {
            companyId: data.companyId,
            productId: data.productId,
            locationId: data.fromLocationId,
            status: sourceStatus,
          },
        },
      });

      if (!existing || existing.quantity < data.quantity) {
        throw new BadRequestException(
          `Không đủ tồn kho: cần ${data.quantity}, hiện có ${existing?.quantity || 0} (mặt hàng ID: ${data.productId}, vị trí ID: ${data.fromLocationId}, trạng thái: ${sourceStatus})`
        );
      }

      const newQty = existing.quantity - data.quantity;
      if (newQty === 0) {
        await tx.inventory.delete({
          where: { id: existing.id },
        });
      } else {
        await tx.inventory.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      }
    }

    // 3. Increase inventory at destination (if toLocationId is specified)
    if (data.toLocationId) {
      const destStatus = data.statusAfter || 'tot';
      
      const destInv = await tx.inventory.findUnique({
        where: {
          companyId_productId_locationId_status: {
            companyId: data.companyId,
            productId: data.productId,
            locationId: data.toLocationId,
            status: destStatus,
          },
        },
      });

      if (destInv) {
        await tx.inventory.update({
          where: { id: destInv.id },
          data: { quantity: destInv.quantity + data.quantity },
        });
      } else {
        await tx.inventory.create({
          data: {
            companyId: data.companyId,
            productId: data.productId,
            locationId: data.toLocationId,
            quantity: data.quantity,
            status: destStatus,
          },
        });
      }
    }

    return movement;
  }
}
