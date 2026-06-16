import { AppDataSource } from '../config/database';
import { WorkOrder, WorkOrderStatus } from '../entities/WorkOrder';
import { MaintenanceRecord, PartUsed } from '../entities/MaintenanceRecord';
import { PartUsageRecord } from '../entities/PartUsageRecord';
import { Part } from '../entities/Part';
import { StreetLight, StreetLightStatus } from '../entities/StreetLight';
import { User, UserRole } from '../entities/User';
import { Notification, NotificationType, RelatedType } from '../entities/Notification';
import { FindOptionsWhere, Between } from 'typeorm';

const workOrderRepository = AppDataSource.getRepository(WorkOrder);
const maintenanceRecordRepository = AppDataSource.getRepository(MaintenanceRecord);
const partUsageRecordRepository = AppDataSource.getRepository(PartUsageRecord);
const partRepository = AppDataSource.getRepository(Part);
const streetLightRepository = AppDataSource.getRepository(StreetLight);
const userRepository = AppDataSource.getRepository(User);
const notificationRepository = AppDataSource.getRepository(Notification);

export interface PartCode {
  partId: string;
  quantity: number;
}

export interface CompleteMaintenanceData {
  description: string;
  photos: string[];
  report: string;
  laborCost: number;
}

export interface MaintenanceFilters {
  maintainerId?: string;
  workOrderId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class MaintenanceService {
  static async scanQRCodeAndStart(
    workOrderId: string,
    maintainerId: string,
    lightCode: string
  ): Promise<WorkOrder> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const workOrder = await transactionalEntityManager.findOne(WorkOrder, {
        where: { id: workOrderId },
        relations: ['streetLight'],
      });

      if (!workOrder) {
        throw new Error('工单不存在');
      }

      if (workOrder.maintainerId !== maintainerId) {
        throw new Error('无权处理此工单');
      }

      if (workOrder.status !== WorkOrderStatus.ACCEPTED && workOrder.status !== WorkOrderStatus.ASSIGNED) {
        throw new Error('工单状态不允许开始维修');
      }

      if (workOrder.streetLight.code !== lightCode) {
        throw new Error('路灯编码不匹配，请确认位置');
      }

      const streetLight = await transactionalEntityManager.findOne(StreetLight, {
        where: { id: workOrder.streetLightId },
      });

      if (streetLight) {
        streetLight.status = StreetLightStatus.MAINTAINING;
        await transactionalEntityManager.save(streetLight);
      }

      const maintenanceRecord = transactionalEntityManager.create(MaintenanceRecord, {
        workOrderId,
        maintainerId,
        startTime: new Date(),
      });
      await transactionalEntityManager.save(maintenanceRecord);

      workOrder.status = WorkOrderStatus.PROCESSING;
      workOrder.startedAt = new Date();

      return await transactionalEntityManager.save(workOrder);
    });
  }

  static async validatePartAndRecordUsage(
    workOrderId: string,
    partCodes: PartCode[],
    maintainerId: string
  ): Promise<PartUsageRecord[]> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const workOrder = await transactionalEntityManager.findOne(WorkOrder, {
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error('工单不存在');
      }

      if (workOrder.maintainerId !== maintainerId) {
        throw new Error('无权处理此工单');
      }

      if (workOrder.status !== WorkOrderStatus.PROCESSING) {
        throw new Error('工单状态不允许使用配件');
      }

      const usageRecords: PartUsageRecord[] = [];
      let totalPartsCost = 0;

      for (const partCode of partCodes) {
        const part = await transactionalEntityManager.findOne(Part, {
          where: { id: partCode.partId },
        });

        if (!part) {
          throw new Error(`配件 ${partCode.partId} 不存在`);
        }

        if (part.stock < partCode.quantity) {
          throw new Error(`配件 ${part.name} 库存不足，当前库存：${part.stock}，需要：${partCode.quantity}`);
        }

        part.stock -= partCode.quantity;
        await transactionalEntityManager.save(part);

        const usageRecord = transactionalEntityManager.create(PartUsageRecord, {
          partId: partCode.partId,
          workOrderId,
          quantity: partCode.quantity,
          usedAt: new Date(),
          maintainerId,
        });

        const savedRecord = await transactionalEntityManager.save(usageRecord);
        savedRecord.part = part;
        usageRecords.push(savedRecord);

        totalPartsCost += part.price * partCode.quantity;
      }

      workOrder.partsCost = (workOrder.partsCost || 0) + totalPartsCost;
      workOrder.totalCost = workOrder.partsCost + (workOrder.laborCost || 0);
      await transactionalEntityManager.save(workOrder);

      return usageRecords;
    });
  }

  static async completeMaintenance(
    workOrderId: string,
    maintainerId: string,
    data: CompleteMaintenanceData
  ): Promise<MaintenanceRecord> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const workOrder = await transactionalEntityManager.findOne(WorkOrder, {
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error('工单不存在');
      }

      if (workOrder.maintainerId !== maintainerId) {
        throw new Error('无权处理此工单');
      }

      if (workOrder.status !== WorkOrderStatus.PROCESSING) {
        throw new Error('工单状态不允许完成维修');
      }

      const maintenanceRecord = await transactionalEntityManager.findOne(MaintenanceRecord, {
        where: { workOrderId },
        order: { createdAt: 'DESC' },
      });

      if (!maintenanceRecord) {
        throw new Error('维修记录不存在');
      }

      const partUsageRecords = await transactionalEntityManager.find(PartUsageRecord, {
        where: { workOrderId },
        relations: ['part'],
      });

      const partsUsed: PartUsed[] = partUsageRecords.map((record) => ({
        partId: record.partId,
        partName: record.part.name,
        quantity: record.quantity,
        price: record.part.price,
      }));

      const partsCost = partUsageRecords.reduce((sum, record) => {
        return sum + record.part.price * record.quantity;
      }, 0);

      const laborCost = data.laborCost || 0;

      maintenanceRecord.endTime = new Date();
      maintenanceRecord.description = data.description;
      maintenanceRecord.photos = data.photos;
      maintenanceRecord.report = data.report;
      maintenanceRecord.partsUsed = partsUsed;

      const savedRecord = await transactionalEntityManager.save(maintenanceRecord);

      workOrder.status = WorkOrderStatus.COMPLETED;
      workOrder.completedAt = new Date();
      workOrder.partsCost = partsCost;
      workOrder.laborCost = laborCost;
      workOrder.totalCost = partsCost + laborCost;

      await transactionalEntityManager.save(workOrder);

      const streetLight = await transactionalEntityManager.findOne(StreetLight, {
        where: { id: workOrder.streetLightId },
      });

      if (streetLight) {
        streetLight.status = StreetLightStatus.NORMAL;
        await transactionalEntityManager.save(streetLight);
      }

      await this.sendNotification(workOrderId, `工单 ${workOrder.orderNo} 已完成，待审核`);

      return savedRecord;
    });
  }

  static async getMaintenanceRecord(id: string): Promise<MaintenanceRecord | null> {
    return maintenanceRecordRepository.findOne({
      where: { id },
      relations: ['workOrder', 'maintainer', 'workOrder.streetLight'],
    });
  }

  static async getMaintenanceList(
    filters: MaintenanceFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: MaintenanceRecord[]; total: number }> {
    const where: FindOptionsWhere<MaintenanceRecord> = {};

    if (filters.maintainerId) {
      where.maintainerId = filters.maintainerId;
    }
    if (filters.workOrderId) {
      where.workOrderId = filters.workOrderId;
    }
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const [items, total] = await maintenanceRecordRepository.findAndCount({
      where,
      relations: ['workOrder', 'maintainer', 'workOrder.streetLight'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  static async getMaintenanceByWorkOrder(workOrderId: string): Promise<MaintenanceRecord | null> {
    return maintenanceRecordRepository.findOne({
      where: { workOrderId },
      relations: ['workOrder', 'maintainer', 'workOrder.streetLight'],
      order: { createdAt: 'DESC' },
    });
  }

  private static async sendNotification(workOrderId: string, content: string): Promise<void> {
    const admins = await userRepository.find({
      where: { role: UserRole.ADMIN, status: true },
    });

    for (const admin of admins) {
      const notification = notificationRepository.create({
        userId: admin.id,
        type: NotificationType.MAINTENANCE,
        title: '维修完成通知',
        content,
        relatedId: workOrderId,
        relatedType: RelatedType.WORK_ORDER,
      });
      await notificationRepository.save(notification);
    }
  }
}

export default MaintenanceService;
