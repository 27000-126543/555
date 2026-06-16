import { AppDataSource } from '../config/database';
import { WorkOrder, WorkOrderStatus } from '../entities/WorkOrder';
import { Inspection, FaultLevel } from '../entities/Inspection';
import { User, UserRole } from '../entities/User';
import { StreetLight, StreetLightStatus } from '../entities/StreetLight';
import { Notification, NotificationType, RelatedType } from '../entities/Notification';
import { MaintenanceRecord, PartUsed } from '../entities/MaintenanceRecord';
import { Between, FindOptionsWhere, In } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from './notification.service';
import { faultTypes, FaultType } from '../data/faultTypes';

const workOrderRepository = AppDataSource.getRepository(WorkOrder);
const userRepository = AppDataSource.getRepository(User);
const streetLightRepository = AppDataSource.getRepository(StreetLight);
const notificationRepository = AppDataSource.getRepository(Notification);
const maintenanceRecordRepository = AppDataSource.getRepository(MaintenanceRecord);
const inspectionRepository = AppDataSource.getRepository(Inspection);

export interface CompleteWorkOrderData {
  description: string;
  photos: string[];
  report: string;
  partsUsed?: PartUsed[];
  partsCost?: number;
  laborCost?: number;
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus;
  maintainerId?: string;
  faultType?: string;
  faultLevel?: FaultLevel;
  area?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WorkOrderStats {
  total: number;
  byStatus: Record<WorkOrderStatus, number>;
  byLevel: {
    low: number;
    medium: number;
    urgent: number;
  };
  avgCompletionTime: number;
  totalCost: number;
}

interface MaintainerScore {
  maintainer: User;
  score: number;
  currentWorkload: number;
  avgCompletionTime: number;
  sameArea: boolean;
  faultTypeMatchCount: number;
  faultTypeAvgTime: number;
  urgentBonus: number;
}

export class WorkOrderService {
  static async autoAssignWorkOrder(inspection: Inspection): Promise<User | null> {
    const streetLight = await streetLightRepository.findOne({
      where: { id: inspection.streetLightId },
    });
    if (!streetLight) {
      return null;
    }

    const maintainers = await userRepository.find({
      where: { role: UserRole.MAINTAINER, status: true },
    });
    if (maintainers.length === 0) {
      return null;
    }

    const isUrgent = inspection.faultLevel === FaultLevel.URGENT;
    const targetFaultType = inspection.faultType;
    const targetArea = streetLight.area;
    const scoredMaintainers: MaintainerScore[] = [];

    for (const maintainer of maintainers) {
      const currentWorkload = await workOrderRepository.count({
        where: {
          maintainerId: maintainer.id,
          status: In([WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.PROCESSING]),
        },
      });

      const allCompletedOrders = await workOrderRepository.find({
        where: {
          maintainerId: maintainer.id,
          status: In([WorkOrderStatus.COMPLETED, WorkOrderStatus.VERIFIED]),
        },
        select: ['createdAt', 'completedAt', 'faultType'],
      });

      let avgCompletionTime = 0;
      if (allCompletedOrders.length > 0) {
        const totalTime = allCompletedOrders.reduce((sum, order) => {
          if (order.createdAt && order.completedAt) {
            return sum + (order.completedAt.getTime() - order.createdAt.getTime());
          }
          return sum;
        }, 0);
        avgCompletionTime = totalTime / allCompletedOrders.length;
      }

      const faultTypeOrders = allCompletedOrders.filter(o => o.faultType === targetFaultType);
      const faultTypeMatchCount = faultTypeOrders.length;

      let faultTypeAvgTime = 0;
      if (faultTypeMatchCount > 0) {
        const totalFaultTypeTime = faultTypeOrders.reduce((sum, order) => {
          if (order.createdAt && order.completedAt) {
            return sum + (order.completedAt.getTime() - order.createdAt.getTime());
          }
          return sum;
        }, 0);
        faultTypeAvgTime = totalFaultTypeTime / faultTypeMatchCount;
      }

      const sameArea = maintainer.area === targetArea;

      let score = 0;

      if (sameArea) {
        score += 25;
      }

      if (faultTypeMatchCount > 0) {
        const experienceScore = Math.min(faultTypeMatchCount * 3, 25);
        score += experienceScore;
        if (faultTypeAvgTime > 0 && avgCompletionTime > 0) {
          const efficiencyRatio = avgCompletionTime / faultTypeAvgTime;
          if (efficiencyRatio > 1) {
            score += Math.min((efficiencyRatio - 1) * 20, 10);
          }
        }
      } else {
        const faultTypeConfig = faultTypes.find((f: FaultType) => f.code === targetFaultType || f.name === targetFaultType);
        if (faultTypeConfig) {
          const hasRequiredSkill = faultTypeConfig.requiredSkills.length === 0 ||
            Math.random() > 0.3;
          if (hasRequiredSkill) {
            score += 5;
          }
        }
      }

      const workloadScore = Math.max(0, 100 - currentWorkload * 20) * 0.25;
      score += workloadScore;

      if (avgCompletionTime > 0) {
        const avgHours = avgCompletionTime / (1000 * 60 * 60);
        const efficiencyScore = Math.max(0, 100 - avgHours * 8) * 0.15;
        score += efficiencyScore;
      }

      let urgentBonus = 0;
      if (isUrgent) {
        if (currentWorkload === 0) {
          urgentBonus += 40;
        } else {
          const workloadReverse = Math.max(0, 30 - currentWorkload * 10);
          urgentBonus += workloadReverse;
        }
        if (faultTypeMatchCount > 0 && faultTypeAvgTime > 0) {
          const faultTypeHours = faultTypeAvgTime / (1000 * 60 * 60);
          urgentBonus += Math.max(0, 30 - faultTypeHours * 10);
        }
        score += urgentBonus;
      }

      scoredMaintainers.push({
        maintainer,
        score,
        currentWorkload,
        avgCompletionTime,
        sameArea,
        faultTypeMatchCount,
        faultTypeAvgTime,
        urgentBonus,
      });
    }

    scoredMaintainers.sort((a, b) => {
      if (isUrgent) {
        if (a.currentWorkload !== b.currentWorkload) {
          return a.currentWorkload - b.currentWorkload;
        }
        if (a.faultTypeAvgTime > 0 && b.faultTypeAvgTime > 0) {
          return a.faultTypeAvgTime - b.faultTypeAvgTime;
        }
        return b.score - a.score;
      }
      return b.score - a.score;
    });

    return scoredMaintainers.length > 0 ? scoredMaintainers[0].maintainer : null;
  }

  static async createWorkOrderFromInspection(inspection: Inspection): Promise<WorkOrder> {
    const streetLight = await streetLightRepository.findOne({
      where: { id: inspection.streetLightId },
    });
    if (!streetLight) {
      throw new Error('路灯不存在');
    }

    const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const priority = inspection.faultLevel === FaultLevel.URGENT ? 3 :
                     inspection.faultLevel === FaultLevel.MEDIUM ? 2 : 1;

    const workOrder = workOrderRepository.create({
      orderNo,
      inspectionId: inspection.id,
      streetLightId: inspection.streetLightId,
      faultType: inspection.faultType,
      faultLevel: inspection.faultLevel,
      status: WorkOrderStatus.PENDING,
      priority,
    });

    const savedOrder = await workOrderRepository.save(workOrder);

    const maintainer = await this.autoAssignWorkOrder(inspection);
    if (maintainer) {
      await this.assignWorkOrder(savedOrder.id, maintainer.id);
    }

    await this.sendNotification(savedOrder, null, '新工单待处理', NotificationType.WORK_ORDER);

    return savedOrder;
  }

  static async assignWorkOrder(orderId: string, maintainerId: string): Promise<WorkOrder | null> {
    const workOrder = await workOrderRepository.findOne({ where: { id: orderId } });
    if (!workOrder) {
      return null;
    }

    const maintainer = await userRepository.findOne({
      where: { id: maintainerId, role: UserRole.MAINTAINER, status: true },
    });
    if (!maintainer) {
      throw new Error('维修员不存在或不可用');
    }

    workOrder.maintainerId = maintainerId;
    workOrder.status = WorkOrderStatus.ASSIGNED;
    workOrder.assignedAt = new Date();

    const savedOrder = await workOrderRepository.save(workOrder);

    await this.sendNotification(
      savedOrder,
      maintainerId,
      `您有新的工单：${savedOrder.orderNo}`,
      NotificationType.WORK_ORDER
    );

    return savedOrder;
  }

  static async acceptWorkOrder(orderId: string, maintainerId: string): Promise<WorkOrder | null> {
    const workOrder = await workOrderRepository.findOne({ where: { id: orderId } });
    if (!workOrder) {
      return null;
    }

    if (workOrder.maintainerId !== maintainerId) {
      throw new Error('无权接此工单');
    }

    if (workOrder.status !== WorkOrderStatus.ASSIGNED) {
      throw new Error('工单状态不允许接单');
    }

    workOrder.status = WorkOrderStatus.ACCEPTED;
    workOrder.acceptedAt = new Date();

    return workOrderRepository.save(workOrder);
  }

  static async startWorkOrder(
    orderId: string,
    maintainerId: string,
    lightCode: string
  ): Promise<WorkOrder | null> {
    const workOrder = await workOrderRepository.findOne({
      where: { id: orderId },
      relations: ['streetLight'],
    });
    if (!workOrder) {
      return null;
    }

    if (workOrder.maintainerId !== maintainerId) {
      throw new Error('无权处理此工单');
    }

    if (workOrder.status !== WorkOrderStatus.ACCEPTED) {
      throw new Error('工单状态不允许开始维修');
    }

    if (workOrder.streetLight.code !== lightCode) {
      throw new Error('路灯编码不匹配，请确认位置');
    }

    const streetLight = await streetLightRepository.findOne({
      where: { id: workOrder.streetLightId },
    });
    if (streetLight) {
      streetLight.status = StreetLightStatus.MAINTAINING;
      await streetLightRepository.save(streetLight);
    }

    const maintenanceRecord = maintenanceRecordRepository.create({
      workOrderId: orderId,
      maintainerId,
      startTime: new Date(),
    });
    await maintenanceRecordRepository.save(maintenanceRecord);

    workOrder.status = WorkOrderStatus.PROCESSING;
    workOrder.startedAt = new Date();

    return workOrderRepository.save(workOrder);
  }

  static async completeWorkOrder(
    orderId: string,
    maintainerId: string,
    data: CompleteWorkOrderData
  ): Promise<WorkOrder | null> {
    const workOrder = await workOrderRepository.findOne({ where: { id: orderId } });
    if (!workOrder) {
      return null;
    }

    if (workOrder.maintainerId !== maintainerId) {
      throw new Error('权限不足：只能完成您名下的工单');
    }

    if (workOrder.status !== WorkOrderStatus.PROCESSING) {
      throw new Error('工单状态不允许完成');
    }

    const maintenanceRecord = await maintenanceRecordRepository.findOne({
      where: { workOrderId: orderId },
      order: { createdAt: 'DESC' },
    });

    if (maintenanceRecord) {
      maintenanceRecord.endTime = new Date();
      maintenanceRecord.description = data.description;
      maintenanceRecord.photos = data.photos;
      maintenanceRecord.report = data.report;
      maintenanceRecord.partsUsed = data.partsUsed || [];
      await maintenanceRecordRepository.save(maintenanceRecord);
    }

    const partsCost = data.partsCost || 0;
    const laborCost = data.laborCost || 0;

    workOrder.status = WorkOrderStatus.COMPLETED;
    workOrder.completedAt = new Date();
    workOrder.partsCost = partsCost;
    workOrder.laborCost = laborCost;
    workOrder.totalCost = partsCost + laborCost;

    const savedOrder = await workOrderRepository.save(workOrder);

    await this.sendNotification(
      savedOrder,
      null,
      `工单 ${savedOrder.orderNo} 已完成，待审核`,
      NotificationType.WORK_ORDER
    );
    if (savedOrder.maintainerId) {
      await this.sendNotification(
        savedOrder,
        savedOrder.maintainerId,
        `您的工单 ${savedOrder.orderNo} 已提交审核，请等待管理员审核`,
        NotificationType.WORK_ORDER
      );
    }

    return savedOrder;
  }

  static async verifyWorkOrder(
    orderId: string,
    adminId: string,
    pass: boolean,
    remark: string
  ): Promise<WorkOrder | null> {
    const workOrder = await workOrderRepository.findOne({ where: { id: orderId } });
    if (!workOrder) {
      return null;
    }

    if (workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new Error('工单状态不允许审核');
    }

    if (pass) {
      workOrder.status = WorkOrderStatus.VERIFIED;
      workOrder.verifiedAt = new Date();

      const streetLight = await streetLightRepository.findOne({
        where: { id: workOrder.streetLightId },
      });
      if (streetLight) {
        streetLight.status = StreetLightStatus.NORMAL;
        await streetLightRepository.save(streetLight);
      }
    } else {
      workOrder.status = WorkOrderStatus.PROCESSING;

      const streetLight = await streetLightRepository.findOne({
        where: { id: workOrder.streetLightId },
      });
      if (streetLight && streetLight.status !== StreetLightStatus.MAINTAINING) {
        streetLight.status = StreetLightStatus.MAINTAINING;
        await streetLightRepository.save(streetLight);
      }
    }

    const savedOrder = await workOrderRepository.save(workOrder);

    if (workOrder.maintainerId) {
      await this.sendNotification(
        savedOrder,
        workOrder.maintainerId,
        `工单 ${savedOrder.orderNo} 审核${pass ? '通过' : '未通过'}` +
          (pass ? '' : `，请重新处理。原因：${remark || '未通过审核'}`),
        NotificationType.WORK_ORDER
      );
    }
    await this.sendNotification(
      savedOrder,
      null,
      `工单 ${savedOrder.orderNo} 已${pass ? '审核通过，路灯恢复正常' : '审核未通过，退回重处理'}`,
      NotificationType.WORK_ORDER
    );

    return savedOrder;
  }

  static async getWorkOrderList(
    filters: WorkOrderFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: WorkOrder[]; total: number }> {
    const where: FindOptionsWhere<WorkOrder> = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.maintainerId) {
      where.maintainerId = filters.maintainerId;
    }
    if (filters.faultType) {
      where.faultType = filters.faultType;
    }
    if (filters.faultLevel) {
      where.faultLevel = filters.faultLevel;
    }
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    let query = workOrderRepository.createQueryBuilder('workOrder')
      .leftJoinAndSelect('workOrder.inspection', 'inspection')
      .leftJoinAndSelect('workOrder.streetLight', 'streetLight')
      .leftJoinAndSelect('workOrder.maintainer', 'maintainer')
      .where(where);

    if (filters.area) {
      query = query.andWhere('streetLight.area = :area', { area: filters.area });
    }

    const [items, total] = await query
      .orderBy('workOrder.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total };
  }

  static async getWorkOrderDetail(id: string): Promise<WorkOrder | null> {
    return workOrderRepository.findOne({
      where: { id },
      relations: ['inspection', 'streetLight', 'maintainer', 'inspection.inspector'],
    });
  }

  static async getWorkOrderStats(
    area?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkOrderStats> {
    let query = workOrderRepository.createQueryBuilder('workOrder')
      .leftJoin('workOrder.streetLight', 'streetLight');

    if (startDate && endDate) {
      query = query.where('workOrder.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (area) {
      query = query.andWhere('streetLight.area = :area', { area });
    }

    const workOrders = await query.getMany();

    const total = workOrders.length;
    const byStatus = {} as Record<WorkOrderStatus, number>;
    const byLevel = { low: 0, medium: 0, urgent: 0 };

    Object.values(WorkOrderStatus).forEach(status => {
      byStatus[status] = 0;
    });

    let totalCompletionTime = 0;
    let completedCount = 0;
    let totalCost = 0;

    workOrders.forEach(order => {
      byStatus[order.status]++;
      if (order.faultLevel === FaultLevel.LOW) byLevel.low++;
      if (order.faultLevel === FaultLevel.MEDIUM) byLevel.medium++;
      if (order.faultLevel === FaultLevel.URGENT) byLevel.urgent++;

      if ((order.status === WorkOrderStatus.COMPLETED || order.status === WorkOrderStatus.VERIFIED)
          && order.createdAt && order.completedAt) {
        totalCompletionTime += order.completedAt.getTime() - order.createdAt.getTime();
        completedCount++;
      }

      totalCost += order.totalCost;
    });

    const avgCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

    return {
      total,
      byStatus,
      byLevel,
      avgCompletionTime,
      totalCost,
    };
  }

  static async generateWorkOrderVoucher(orderId: string): Promise<string> {
    const workOrder = await workOrderRepository.findOne({
      where: { id: orderId },
      relations: ['inspection', 'streetLight', 'maintainer', 'inspection.inspector'],
    });

    if (!workOrder) {
      throw new Error('工单不存在');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'vouchers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `${workOrder.orderNo}.pdf`);
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('工单维修凭证', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`工单编号：${workOrder.orderNo}`);
    doc.text(`工单状态：${workOrder.status}`);
    doc.text(`创建时间：${workOrder.createdAt.toLocaleString()}`);
    doc.moveDown();

    doc.text(`路灯编号：${workOrder.streetLight.code}`);
    doc.text(`路灯位置：${workOrder.streetLight.address}`);
    doc.text(`所属区域：${workOrder.streetLight.area}`);
    doc.moveDown();

    doc.text(`故障类型：${workOrder.faultType || '-'}`);
    doc.text(`故障等级：${workOrder.faultLevel || '-'}`);
    doc.text(`优先级：${workOrder.priority}`);
    doc.moveDown();

    if (workOrder.maintainer) {
      doc.text(`维修员：${workOrder.maintainer.realName}`);
      doc.text(`联系电话：${workOrder.maintainer.phone || '-'}`);
    }
    doc.moveDown();

    if (workOrder.inspection) {
      doc.text(`巡检员：${workOrder.inspection.inspector?.realName || '-'}`);
      doc.text(`巡检描述：${workOrder.inspection.description || '-'}`);
    }
    doc.moveDown();

    doc.text(`分配时间：${workOrder.assignedAt?.toLocaleString() || '-'}`);
    doc.text(`接单时间：${workOrder.acceptedAt?.toLocaleString() || '-'}`);
    doc.text(`开始时间：${workOrder.startedAt?.toLocaleString() || '-'}`);
    doc.text(`完成时间：${workOrder.completedAt?.toLocaleString() || '-'}`);
    doc.text(`审核时间：${workOrder.verifiedAt?.toLocaleString() || '-'}`);
    doc.moveDown();

    doc.text(`配件费用：¥${workOrder.partsCost.toFixed(2)}`);
    doc.text(`人工费用：¥${workOrder.laborCost.toFixed(2)}`);
    doc.text(`总费用：¥${workOrder.totalCost.toFixed(2)}`);

    doc.end();

    return filePath;
  }

  private static async sendNotification(
    workOrder: WorkOrder,
    userId: string | null,
    content: string,
    type: NotificationType
  ): Promise<void> {
    if (userId) {
      await NotificationService.createNotification(
        userId,
        type,
        '工单通知',
        content,
        workOrder.id,
        RelatedType.WORK_ORDER
      );
    } else {
      await NotificationService.createNotificationForRole(
        UserRole.ADMIN,
        type,
        '工单通知',
        content,
        workOrder.id,
        RelatedType.WORK_ORDER
      );
    }
  }
}

export default WorkOrderService;
