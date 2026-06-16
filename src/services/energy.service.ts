import { AppDataSource } from '../config/database';
import { EnergyConsumption } from '../entities/EnergyConsumption';
import { EnergyAlert, AlertType } from '../entities/EnergyAlert';
import { AreaConfig } from '../entities/AreaConfig';
import { User, UserRole } from '../entities/User';
import { NotificationType, RelatedType } from '../entities/Notification';
import { NotificationService } from './notification.service';
import { budgetDeviationThreshold } from '../config/energyConfig';
import { Between, FindOptionsWhere, LessThan, MoreThanOrEqual } from 'typeorm';

const energyConsumptionRepository = AppDataSource.getRepository(EnergyConsumption);
const energyAlertRepository = AppDataSource.getRepository(EnergyAlert);
const areaConfigRepository = AppDataSource.getRepository(AreaConfig);
const userRepository = AppDataSource.getRepository(User);

export interface EnergyConsumptionData {
  streetLightId: string;
  area: string;
  date: Date;
  consumption: number;
  duration?: number;
}

export interface EnergyAlertFilters {
  area?: string;
  alertType?: AlertType;
  isHandled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface EnergyConsumptionFilters {
  area?: string;
  streetLightId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface EnergyStats {
  totalConsumption: number;
  avgDailyConsumption: number;
  maxDailyConsumption: number;
  minDailyConsumption: number;
  dailyData: { date: string; consumption: number }[];
}

export interface EnergyTrendData {
  date: string;
  consumption: number;
  budget: number;
}

export interface BudgetMonitorResult {
  area: string;
  date: string;
  actualConsumption: number;
  budget: number;
  deviation: number;
  deviationThreshold: number;
  isOverBudget: boolean;
  isLocked: boolean;
  alertCreated: boolean;
}

export class EnergyService {
  static async recordEnergyConsumption(data: EnergyConsumptionData): Promise<EnergyConsumption> {
    const consumption = energyConsumptionRepository.create(data);
    return energyConsumptionRepository.save(consumption);
  }

  static async batchRecordEnergyConsumption(records: EnergyConsumptionData[]): Promise<EnergyConsumption[]> {
    const consumptions = energyConsumptionRepository.create(records);
    return energyConsumptionRepository.save(consumptions);
  }

  static async calculateDailyEnergyByArea(area: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await energyConsumptionRepository
      .createQueryBuilder('ec')
      .select('SUM(ec.consumption)', 'total')
      .where('ec.area = :area', { area })
      .andWhere('ec.date BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  static async calculateMonthlyEnergyByArea(area: string, month: Date): Promise<number> {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await energyConsumptionRepository
      .createQueryBuilder('ec')
      .select('SUM(ec.consumption)', 'total')
      .where('ec.area = :area', { area })
      .andWhere('ec.date BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  static async getEnergyConsumptionList(
    filters: EnergyConsumptionFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: EnergyConsumption[]; total: number }> {
    const where: FindOptionsWhere<EnergyConsumption> = {};

    if (filters.area) {
      where.area = filters.area;
    }
    if (filters.streetLightId) {
      where.streetLightId = filters.streetLightId;
    }
    if (filters.startDate && filters.endDate) {
      where.date = Between(filters.startDate, filters.endDate);
    }

    const [items, total] = await energyConsumptionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['streetLight'],
    });

    return { items, total };
  }

  static async getEnergyStats(
    area: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnergyStats> {
    const dailyData = await energyConsumptionRepository
      .createQueryBuilder('ec')
      .select('DATE(ec.date)', 'date')
      .addSelect('SUM(ec.consumption)', 'consumption')
      .where('ec.area = :area', { area })
      .andWhere('ec.date BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('DATE(ec.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const consumptions = dailyData.map((d) => parseFloat(d.consumption || '0'));
    const totalConsumption = consumptions.reduce((sum, c) => sum + c, 0);
    const avgDailyConsumption = consumptions.length > 0 ? totalConsumption / consumptions.length : 0;
    const maxDailyConsumption = consumptions.length > 0 ? Math.max(...consumptions) : 0;
    const minDailyConsumption = consumptions.length > 0 ? Math.min(...consumptions) : 0;

    return {
      totalConsumption,
      avgDailyConsumption,
      maxDailyConsumption,
      minDailyConsumption,
      dailyData: dailyData.map((d) => ({
        date: d.date,
        consumption: parseFloat(d.consumption || '0'),
      })),
    };
  }

  static async monitorDailyEnergyBudget(area: string, date: Date): Promise<BudgetMonitorResult> {
    const areaConfig = await areaConfigRepository.findOne({ where: { areaName: area } });
    if (!areaConfig) {
      throw new Error('区域配置不存在');
    }

    const actualConsumption = await this.calculateDailyEnergyByArea(area, date);
    const budget = areaConfig.dailyEnergyBudget;
    const deviation = budget > 0 ? ((actualConsumption - budget) / budget) * 100 : 0;
    const isOverBudget = Math.abs(deviation) > budgetDeviationThreshold;

    let isLocked = areaConfig.isLocked;
    let alertCreated = false;

    if (isOverBudget && !areaConfig.isLocked) {
      areaConfig.isLocked = true;
      areaConfig.lockReason = `能耗超出预算${deviation.toFixed(2)}%`;
      await areaConfigRepository.save(areaConfig);
      isLocked = true;

      const existingAlert = await energyAlertRepository.findOne({
        where: {
          area,
          alertType: AlertType.DAILY_OVER_BUDGET,
          isHandled: false,
          createdAt: MoreThanOrEqual(new Date(date.getFullYear(), date.getMonth(), date.getDate())),
        },
      });

      if (!existingAlert) {
        const alert = energyAlertRepository.create({
          area,
          alertType: AlertType.DAILY_OVER_BUDGET,
          message: `${area} 区域 ${date.toLocaleDateString()} 能耗超出预算 ${deviation.toFixed(2)}%`,
          threshold: budgetDeviationThreshold,
          actualValue: deviation,
          isHandled: false,
        });
        await energyAlertRepository.save(alert);
        alertCreated = true;

        const admins = await userRepository.find({
          where: { role: UserRole.ADMIN, status: true },
        });

        for (const admin of admins) {
          await NotificationService.createNotification(
            admin.id,
            NotificationType.ENERGY_ALERT,
            '能耗预警',
            `${area} 区域能耗超出预算 ${deviation.toFixed(2)}%，已锁定区域配置`,
            alert.id,
            RelatedType.ENERGY_ALERT
          );
        }
      }
    }

    return {
      area,
      date: date.toISOString().split('T')[0],
      actualConsumption,
      budget,
      deviation,
      deviationThreshold: budgetDeviationThreshold,
      isOverBudget,
      isLocked,
      alertCreated,
    };
  }

  static async checkAndHandleEnergyAlerts(): Promise<void> {
    const unhandledAlerts = await energyAlertRepository.find({
      where: { isHandled: false },
      order: { createdAt: 'DESC' },
    });

    for (const alert of unhandledAlerts) {
      const areaConfig = await areaConfigRepository.findOne({ where: { areaName: alert.area } });
      if (!areaConfig) continue;

      const today = new Date();
      const actualConsumption = await this.calculateDailyEnergyByArea(alert.area, today);
      const budget = areaConfig.dailyEnergyBudget;
      const deviation = budget > 0 ? ((actualConsumption - budget) / budget) * 100 : 0;

      if (Math.abs(deviation) <= budgetDeviationThreshold && areaConfig.isLocked) {
        areaConfig.isLocked = false;
        areaConfig.lockReason = '';
        await areaConfigRepository.save(areaConfig);

        alert.isHandled = true;
        alert.handledBy = undefined as any;
        alert.handledAt = new Date();
        await energyAlertRepository.save(alert);
      }
    }
  }

  static async getEnergyAlerts(
    filters: EnergyAlertFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: EnergyAlert[]; total: number }> {
    const where: FindOptionsWhere<EnergyAlert> = {};

    if (filters.area) {
      where.area = filters.area;
    }
    if (filters.alertType) {
      where.alertType = filters.alertType;
    }
    if (filters.isHandled !== undefined) {
      where.isHandled = filters.isHandled;
    }
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const [items, total] = await energyAlertRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['handler'],
    });

    return { items, total };
  }

  static async handleEnergyAlert(
    alertId: string,
    adminId: string,
    remark: string
  ): Promise<EnergyAlert | null> {
    const alert = await energyAlertRepository.findOne({ where: { id: alertId } });
    if (!alert) {
      return null;
    }

    if (alert.isHandled) {
      throw new Error('该预警已处理');
    }

    const admin = await userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN, status: true },
    });
    if (!admin) {
      throw new Error('只有管理员可以处理预警');
    }

    alert.isHandled = true;
    alert.handledBy = adminId;
    alert.handledAt = new Date();
    await energyAlertRepository.save(alert);

    const areaConfig = await areaConfigRepository.findOne({ where: { areaName: alert.area } });
    if (areaConfig && areaConfig.isLocked) {
      areaConfig.isLocked = false;
      areaConfig.lockReason = remark || '管理员手动解锁';
      await areaConfigRepository.save(areaConfig);
    }

    return alert;
  }

  static async getAreaEnergyTrend(area: string, days: number): Promise<EnergyTrendData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const areaConfig = await areaConfigRepository.findOne({ where: { areaName: area } });
    const dailyBudget = areaConfig?.dailyEnergyBudget || 0;

    const dailyData = await energyConsumptionRepository
      .createQueryBuilder('ec')
      .select('DATE(ec.date)', 'date')
      .addSelect('SUM(ec.consumption)', 'consumption')
      .where('ec.area = :area', { area })
      .andWhere('ec.date >= :start', { start: startDate })
      .andWhere('ec.date <= :end', { end: endDate })
      .groupBy('DATE(ec.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const result: EnergyTrendData[] = [];
    const dataMap = new Map(
      dailyData.map((d) => [d.date, parseFloat(d.consumption || '0')])
    );

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        consumption: dataMap.get(dateStr) || 0,
        budget: dailyBudget,
      });
    }

    return result;
  }
}

export default EnergyService;
