import { AppDataSource } from '../config/database';
import { FinancialReport } from '../entities/FinancialReport';
import { WorkOrder, WorkOrderStatus } from '../entities/WorkOrder';
import { StreetLight } from '../entities/StreetLight';
import { EnergyConsumption } from '../entities/EnergyConsumption';
import { PartUsageRecord } from '../entities/PartUsageRecord';
import { MaintenanceRecord } from '../entities/MaintenanceRecord';
import { User, UserRole } from '../entities/User';
import { Notification, NotificationType, RelatedType } from '../entities/Notification';
import { ENERGY_COEFFICIENTS } from '../utils/constants';
import { Between, FindOptionsWhere, In } from 'typeorm';
import * as cron from 'node-cron';
import dayjs from 'dayjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

const financialReportRepository = AppDataSource.getRepository(FinancialReport);
const workOrderRepository = AppDataSource.getRepository(WorkOrder);
const streetLightRepository = AppDataSource.getRepository(StreetLight);
const energyConsumptionRepository = AppDataSource.getRepository(EnergyConsumption);
const partUsageRecordRepository = AppDataSource.getRepository(PartUsageRecord);
const maintenanceRecordRepository = AppDataSource.getRepository(MaintenanceRecord);
const userRepository = AppDataSource.getRepository(User);
const notificationRepository = AppDataSource.getRepository(Notification);

export interface ReportFilters {
  month?: string;
  area?: string;
  startDate?: Date;
  endDate?: Date;
  minScore?: number;
  maxScore?: number;
}

export interface AreaPerformanceData {
  area: string;
  totalFaults: number;
  faultRate: number;
  averageRepairTime: number;
  totalEnergyCost: number;
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  performanceScore: number;
  costControl: number;
}

export interface PerformanceComparison {
  month: string;
  areas: AreaPerformanceData[];
  bestPerformer: AreaPerformanceData | null;
  worstPerformer: AreaPerformanceData | null;
  averageScore: number;
  generatedAt: Date;
}

export class FinanceService {
  static initializeCronJobs() {
    cron.schedule('0 0 1 * *', async () => {
      try {
        const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
        console.log(`[CRON] 自动生成 ${lastMonth} 月份财务报表`);
        await this.generateMonthlyReport(lastMonth);
        await this.generatePerformanceComparisonReport(lastMonth);
      } catch (err) {
        console.error('[CRON] 自动生成报表失败:', err);
      }
    }, {
      timezone: 'Asia/Shanghai',
    });
    console.log('[CRON] 财务报表定时任务已启动（每月1号0点）');
  }

  static async generateMonthlyReport(month: string): Promise<FinancialReport[]> {
    const areas = await this.getAllAreas();
    const reports: FinancialReport[] = [];

    for (const area of areas) {
      const existingReport = await financialReportRepository.findOne({
        where: { reportMonth: month, area },
      });

      if (existingReport) {
        reports.push(existingReport);
        continue;
      }

      const totalFaults = await this.getTotalFaults(area, month);
      const averageRepairTime = await this.calculateAverageRepairTime(area, month);
      const totalEnergyCost = await this.calculateEnergyCost(area, month);
      const totalPartsCost = await this.calculatePartsCost(area, month);
      const totalLaborCost = await this.calculateLaborCost(area, month);
      const totalCost = totalEnergyCost + totalPartsCost + totalLaborCost;
      const faultRate = await this.calculateFaultRate(area, month);
      const costControl = await this.calculateCostControl(area, month, totalCost);
      const performanceScore = this.calculatePerformanceScore(faultRate, averageRepairTime, costControl);

      const report = financialReportRepository.create({
        reportMonth: month,
        area,
        totalFaults,
        averageRepairTime,
        totalEnergyCost,
        totalPartsCost,
        totalLaborCost,
        totalCost,
        performanceScore,
      });

      const savedReport = await financialReportRepository.save(report);
      reports.push(savedReport);

      await this.generateReportVoucher(savedReport);
    }

    await this.notifyAdmins(month);

    return reports;
  }

  static async getReportList(
    filters: ReportFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: FinancialReport[]; total: number }> {
    const where: FindOptionsWhere<FinancialReport> = {};

    if (filters.month) {
      where.reportMonth = filters.month;
    }
    if (filters.area) {
      where.area = filters.area;
    }

    let query = financialReportRepository.createQueryBuilder('report');

    if (filters.startDate && filters.endDate) {
      query = query.where('report.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.minScore !== undefined) {
      query = query.andWhere('report.performanceScore >= :minScore', { minScore: filters.minScore });
    }

    if (filters.maxScore !== undefined) {
      query = query.andWhere('report.performanceScore <= :maxScore', { maxScore: filters.maxScore });
    }

    Object.keys(where).forEach(key => {
      query = query.andWhere(`report.${key} = :${key}`, { [key]: (where as any)[key] });
    });

    const [items, total] = await query
      .orderBy('report.reportMonth', 'DESC')
      .addOrderBy('report.performanceScore', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total };
  }

  static async getReportDetail(id: string): Promise<FinancialReport | null> {
    return financialReportRepository.findOne({
      where: { id },
    });
  }

  static async getReportByMonth(month: string): Promise<FinancialReport[]> {
    return financialReportRepository.find({
      where: { reportMonth: month },
      order: { performanceScore: 'DESC' },
    });
  }

  static async calculateFaultRate(area: string, month: string): Promise<number> {
    const totalLights = await streetLightRepository.count({ where: { area } });
    if (totalLights === 0) return 0;

    const totalFaults = await this.getTotalFaults(area, month);
    return totalFaults / totalLights;
  }

  static async calculateAverageRepairTime(area: string, month: string): Promise<number> {
    const { startDate, endDate } = this.getMonthDateRange(month);

    const completedOrders = await workOrderRepository
      .createQueryBuilder('workOrder')
      .leftJoin('workOrder.streetLight', 'streetLight')
      .where('streetLight.area = :area', { area })
      .andWhere('workOrder.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.COMPLETED, WorkOrderStatus.VERIFIED],
      })
      .andWhere('workOrder.completedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('workOrder.startedAt IS NOT NULL')
      .andWhere('workOrder.completedAt IS NOT NULL')
      .select(['workOrder.startedAt', 'workOrder.completedAt'])
      .getMany();

    if (completedOrders.length === 0) return 0;

    const totalTime = completedOrders.reduce((sum, order) => {
      if (order.startedAt && order.completedAt) {
        return sum + (order.completedAt.getTime() - order.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedOrders.length / (1000 * 60 * 60);
  }

  static async calculateEnergyCost(area: string, month: string): Promise<number> {
    const { startDate, endDate } = this.getMonthDateRange(month);

    const consumptions = await energyConsumptionRepository.find({
      where: {
        area,
        date: Between(startDate, endDate),
      },
    });

    const totalConsumption = consumptions.reduce((sum, c) => sum + c.consumption, 0);
    const electricityPrice = ENERGY_COEFFICIENTS.electricityPrice;

    return totalConsumption * electricityPrice;
  }

  static async calculatePartsCost(area: string, month: string): Promise<number> {
    const { startDate, endDate } = this.getMonthDateRange(month);

    const partUsages = await partUsageRecordRepository
      .createQueryBuilder('usage')
      .leftJoin('usage.workOrder', 'workOrder')
      .leftJoin('workOrder.streetLight', 'streetLight')
      .leftJoin('usage.part', 'part')
      .where('streetLight.area = :area', { area })
      .andWhere('usage.usedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select(['usage.quantity', 'part.price'])
      .getMany();

    return partUsages.reduce((sum, usage) => {
      return sum + (usage.quantity * (usage.part?.price || 0));
    }, 0);
  }

  static async calculateLaborCost(area: string, month: string): Promise<number> {
    const { startDate, endDate } = this.getMonthDateRange(month);

    const maintenanceRecords = await maintenanceRecordRepository
      .createQueryBuilder('record')
      .leftJoin('record.workOrder', 'workOrder')
      .leftJoin('workOrder.streetLight', 'streetLight')
      .where('streetLight.area = :area', { area })
      .andWhere('record.endTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('record.startTime IS NOT NULL')
      .andWhere('record.endTime IS NOT NULL')
      .select(['record.startTime', 'record.endTime'])
      .getMany();

    const hourlyRate = 50;

    return maintenanceRecords.reduce((sum, record) => {
      if (record.startTime && record.endTime) {
        const hours = (record.endTime.getTime() - record.startTime.getTime()) / (1000 * 60 * 60);
        return sum + hours * hourlyRate;
      }
      return sum;
    }, 0);
  }

  static calculatePerformanceScore(
    faultRate: number,
    avgRepairTime: number,
    costControl: number
  ): number {
    const faultRateScore = Math.max(0, 100 - faultRate * 1000) * 0.3;
    const repairTimeScore = Math.max(0, 100 - avgRepairTime * 5) * 0.3;
    const costScore = costControl * 0.4;

    return Math.round(faultRateScore + repairTimeScore + costScore);
  }

  static async comparePerformance(month: string): Promise<PerformanceComparison> {
    const reports = await this.getReportByMonth(month);

    const areas: AreaPerformanceData[] = await Promise.all(
      reports.map(async (report) => {
        const faultRate = await this.calculateFaultRate(report.area, month);
        const costControl = await this.calculateCostControl(
          report.area,
          month,
          report.totalCost
        );

        return {
          area: report.area,
          totalFaults: report.totalFaults,
          faultRate,
          averageRepairTime: report.averageRepairTime,
          totalEnergyCost: report.totalEnergyCost,
          totalPartsCost: report.totalPartsCost,
          totalLaborCost: report.totalLaborCost,
          totalCost: report.totalCost,
          performanceScore: report.performanceScore,
          costControl,
        };
      })
    );

    areas.sort((a, b) => b.performanceScore - a.performanceScore);

    const averageScore = areas.length > 0
      ? areas.reduce((sum, a) => sum + a.performanceScore, 0) / areas.length
      : 0;

    return {
      month,
      areas,
      bestPerformer: areas.length > 0 ? areas[0] : null,
      worstPerformer: areas.length > 0 ? areas[areas.length - 1] : null,
      averageScore: Math.round(averageScore * 100) / 100,
      generatedAt: new Date(),
    };
  }

  static async generatePerformanceComparisonReport(month: string): Promise<PerformanceComparison> {
    const comparison = await this.comparePerformance(month);
    await this.generatePerformancePDF(comparison);
    await this.notifyPerformanceComparison(comparison);
    return comparison;
  }

  static async generateReportVoucher(report: FinancialReport): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'finance', 'vouchers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `report_${report.reportMonth}_${report.area}.pdf`);
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('财务报表凭证', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`报表月份：${report.reportMonth}`);
    doc.text(`所属区域：${report.area}`);
    doc.text(`生成时间：${report.createdAt.toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(16).text('一、故障统计');
    doc.fontSize(12).text(`总故障数：${report.totalFaults} 起`);
    doc.text(`平均修复时长：${report.averageRepairTime.toFixed(2)} 小时`);
    doc.moveDown();

    doc.fontSize(16).text('二、费用统计');
    doc.fontSize(12).text(`能耗费用：¥${report.totalEnergyCost.toFixed(2)}`);
    doc.text(`配件费用：¥${report.totalPartsCost.toFixed(2)}`);
    doc.text(`人工费用：¥${report.totalLaborCost.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text(`总成本：¥${report.totalCost.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(16).text('三、绩效评分');
    doc.fontSize(14).text(`综合评分：${report.performanceScore} 分`);
    doc.moveDown();

    doc.fontSize(10).text('本凭证由系统自动生成，具有法律效力');
    doc.text(`生成时间：${new Date().toLocaleString()}`);

    doc.end();

    return filePath;
  }

  private static async getAllAreas(): Promise<string[]> {
    const result = await streetLightRepository
      .createQueryBuilder('light')
      .select('DISTINCT light.area', 'area')
      .where('light.area IS NOT NULL')
      .andWhere('light.area != :empty', { empty: '' })
      .getRawMany();

    return result.map(r => r.area);
  }

  private static getMonthDateRange(month: string): { startDate: Date; endDate: Date } {
    const startDate = dayjs(month + '-01').startOf('month').toDate();
    const endDate = dayjs(month + '-01').endOf('month').toDate();
    return { startDate, endDate };
  }

  private static async getTotalFaults(area: string, month: string): Promise<number> {
    const { startDate, endDate } = this.getMonthDateRange(month);

    return workOrderRepository
      .createQueryBuilder('workOrder')
      .leftJoin('workOrder.streetLight', 'streetLight')
      .where('streetLight.area = :area', { area })
      .andWhere('workOrder.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();
  }

  private static async calculateCostControl(
    area: string,
    month: string,
    actualCost: number
  ): Promise<number> {
    const lastMonth = dayjs(month + '-01').subtract(1, 'month').format('YYYY-MM');
    const lastMonthReports = await this.getReportByMonth(lastMonth);
    const lastMonthReport = lastMonthReports.find(r => r.area === area);

    if (!lastMonthReport || lastMonthReport.totalCost === 0) {
      return 80;
    }

    const costRatio = lastMonthReport.totalCost / actualCost;
    const score = Math.min(100, costRatio * 80);

    return Math.max(0, score);
  }

  private static async generatePerformancePDF(comparison: PerformanceComparison): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'finance', 'performance');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `performance_${comparison.month}.pdf`);
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('区域绩效对比报表', { align: 'center' });
    doc.text(`统计月份：${comparison.month}`, { align: 'center' });
    doc.moveDown();

    if (comparison.bestPerformer) {
      doc.fontSize(14).fillColor('#52c41a').text(`最佳表现区域：${comparison.bestPerformer.area}`);
      doc.fillColor('black');
    }
    if (comparison.worstPerformer) {
      doc.fontSize(14).fillColor('#ff4d4f').text(`待改进区域：${comparison.worstPerformer.area}`);
      doc.fillColor('black');
    }
    doc.fontSize(14).text(`平均评分：${comparison.averageScore} 分`);
    doc.moveDown();

    doc.fontSize(16).text('各区域详细数据：');
    doc.moveDown();

    comparison.areas.forEach((areaData, index) => {
      doc.fontSize(14).text(`${index + 1}. ${areaData.area}`);
      doc.fontSize(12).text(`   故障数：${areaData.totalFaults} 起`);
      doc.text(`   故障率：${(areaData.faultRate * 100).toFixed(2)}%`);
      doc.text(`   平均修复时长：${areaData.averageRepairTime.toFixed(2)} 小时`);
      doc.text(`   总成本：¥${areaData.totalCost.toFixed(2)}`);
      doc.text(`   绩效评分：${areaData.performanceScore} 分`);
      doc.moveDown();
    });

    doc.fontSize(10).text(`生成时间：${new Date().toLocaleString()}`);

    doc.end();

    return filePath;
  }

  private static async notifyAdmins(month: string): Promise<void> {
    const admins = await userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.FINANCE]), status: true },
    });

    for (const admin of admins) {
      const notification = notificationRepository.create({
        userId: admin.id,
        type: NotificationType.SYSTEM,
        title: '月度财务报表已生成',
        content: `${month} 月份财务报表已生成，请及时查看。`,
        relatedType: RelatedType.MAINTENANCE_RECORD,
      });
      await notificationRepository.save(notification);
    }
  }

  private static async notifyPerformanceComparison(comparison: PerformanceComparison): Promise<void> {
    const admins = await userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.FINANCE]), status: true },
    });

    for (const admin of admins) {
      const notification = notificationRepository.create({
        userId: admin.id,
        type: NotificationType.SYSTEM,
        title: '区域绩效对比报表已生成',
        content: `${comparison.month} 月份区域绩效对比报表已生成，平均评分：${comparison.averageScore} 分。`,
        relatedType: RelatedType.MAINTENANCE_RECORD,
      });
      await notificationRepository.save(notification);
    }
  }

  static async getVoucherPath(id: string): Promise<string | null> {
    const report = await this.getReportDetail(id);
    if (!report) return null;

    const filePath = path.join(
      process.cwd(),
      'uploads',
      'finance',
      'vouchers',
      `report_${report.reportMonth}_${report.area}.pdf`
    );

    if (fs.existsSync(filePath)) {
      return filePath;
    }

    return this.generateReportVoucher(report);
  }
}

export default FinanceService;
