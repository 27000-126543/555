import { Request, Response, NextFunction } from 'express';
import { FinanceService, ReportFilters } from '../services/finance.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';
import * as fs from 'fs';
import * as path from 'path';

export class FinanceController {
  static async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { month } = req.body;

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.FINANCE)) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员和财务人员可以生成报表', HttpStatus.FORBIDDEN));
      }

      if (!month) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少月份参数', HttpStatus.BAD_REQUEST));
      }

      const reports = await FinanceService.generateMonthlyReport(month);

      return res.json(success(reports, '报表生成成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getReportList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        month,
        area,
        startDate,
        endDate,
        minScore,
        maxScore,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: ReportFilters = {
        month: month as string,
        area: area as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minScore: minScore !== undefined ? parseFloat(minScore as string) : undefined,
        maxScore: maxScore !== undefined ? parseFloat(maxScore as string) : undefined,
      };

      const result = await FinanceService.getReportList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getReportDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const report = await FinanceService.getReportDetail(id);

      if (!report) {
        return res.status(HttpStatus.NOT_FOUND).json(error('报表不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(report));
    } catch (err) {
      next(err);
    }
  }

  static async getReportByMonth(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.params;

      if (!month) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少月份参数', HttpStatus.BAD_REQUEST));
      }

      const reports = await FinanceService.getReportByMonth(month);

      return res.json(success(reports));
    } catch (err) {
      next(err);
    }
  }

  static async comparePerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.query;

      if (!month) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少月份参数', HttpStatus.BAD_REQUEST));
      }

      const comparison = await FinanceService.comparePerformance(month as string);

      return res.json(success(comparison));
    } catch (err) {
      next(err);
    }
  }

  static async downloadVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const filePath = await FinanceService.getVoucherPath(id);

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(HttpStatus.NOT_FOUND).json(error('凭证不存在', HttpStatus.NOT_FOUND));
      }

      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/pdf');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export default FinanceController;
