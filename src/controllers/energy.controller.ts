import { Request, Response, NextFunction } from 'express';
import {
  EnergyService,
  EnergyConsumptionData,
  EnergyConsumptionFilters,
  EnergyAlertFilters,
} from '../services/energy.service';
import { AlertType } from '../entities/EnergyAlert';
import { success, error, paginate, HttpStatus } from '../utils/response';

export class EnergyController {
  static async recordEnergyConsumption(req: Request, res: Response, next: NextFunction) {
    try {
      const { streetLightId, area, date, consumption, duration } = req.body;

      if (!streetLightId || !area || !date || consumption === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: EnergyConsumptionData = {
        streetLightId,
        area,
        date: new Date(date),
        consumption: parseFloat(consumption),
        duration: duration ? parseFloat(duration) : undefined,
      };

      const result = await EnergyService.recordEnergyConsumption(data);
      return res.json(success(result, '能耗记录成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getEnergyConsumptionList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        area,
        streetLightId,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: EnergyConsumptionFilters = {
        area: area as string,
        streetLightId: streetLightId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const result = await EnergyService.getEnergyConsumptionList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(
        paginate(
          result.items,
          result.total,
          parseInt(page as string),
          parseInt(pageSize as string)
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getEnergyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { area, startDate, endDate } = req.query;

      if (!area || !startDate || !endDate) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const result = await EnergyService.getEnergyStats(
        area as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      return res.json(success(result));
    } catch (err) {
      next(err);
    }
  }

  static async getEnergyAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        area,
        alertType,
        isHandled,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: EnergyAlertFilters = {
        area: area as string,
        alertType: alertType as AlertType,
        isHandled: isHandled !== undefined ? isHandled === 'true' : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const result = await EnergyService.getEnergyAlerts(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(
        paginate(
          result.items,
          result.total,
          parseInt(page as string),
          parseInt(pageSize as string)
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async handleEnergyAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { remark } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以处理预警', HttpStatus.FORBIDDEN));
      }

      const result = await EnergyService.handleEnergyAlert(id, user.userId, remark || '');

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('预警不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(result, '预警处理成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getAreaEnergyTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const { area, days = 7 } = req.query;

      if (!area) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少区域参数', HttpStatus.BAD_REQUEST));
      }

      const result = await EnergyService.getAreaEnergyTrend(
        area as string,
        parseInt(days as string)
      );

      return res.json(success(result));
    } catch (err) {
      next(err);
    }
  }

  static async triggerBudgetMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const { area, date } = req.body;

      if (!area) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少区域参数', HttpStatus.BAD_REQUEST));
      }

      const monitorDate = date ? new Date(date) : new Date();
      const result = await EnergyService.monitorDailyEnergyBudget(area, monitorDate);

      return res.json(success(result, '预算监控执行完成'));
    } catch (err) {
      next(err);
    }
  }
}

export default EnergyController;
