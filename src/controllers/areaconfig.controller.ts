import { Request, Response, NextFunction } from 'express';
import {
  AreaConfigService,
  CreateAreaConfigData,
  UpdateAreaConfigData,
  AreaConfigFilters,
} from '../services/areaconfig.service';
import { success, error, paginate, HttpStatus } from '../utils/response';

export class AreaConfigController {
  static async createAreaConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { areaName, lightOnTime, lightOffTime, dailyEnergyBudget, monthlyEnergyBudget } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以创建区域配置', HttpStatus.FORBIDDEN));
      }

      if (!areaName || !lightOnTime || !lightOffTime) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: CreateAreaConfigData = {
        areaName,
        lightOnTime,
        lightOffTime,
        dailyEnergyBudget: dailyEnergyBudget ? parseFloat(dailyEnergyBudget) : 0,
        monthlyEnergyBudget: monthlyEnergyBudget ? parseFloat(monthlyEnergyBudget) : 0,
      };

      const result = await AreaConfigService.createAreaConfig(data);
      return res.status(HttpStatus.CREATED).json(success(result, '区域配置创建成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getAreaConfigList(req: Request, res: Response, next: NextFunction) {
    try {
      const { areaName, isLocked, page = 1, pageSize = 10 } = req.query;

      const filters: AreaConfigFilters = {
        areaName: areaName as string,
        isLocked: isLocked !== undefined ? isLocked === 'true' : undefined,
      };

      const result = await AreaConfigService.getAreaConfigList(
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

  static async getAreaConfigDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await AreaConfigService.getAreaConfigDetail(id);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('区域配置不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(result));
    } catch (err) {
      next(err);
    }
  }

  static async updateAreaConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { lightOnTime, lightOffTime, dailyEnergyBudget, monthlyEnergyBudget } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以更新区域配置', HttpStatus.FORBIDDEN));
      }

      const data: UpdateAreaConfigData = {
        lightOnTime,
        lightOffTime,
        dailyEnergyBudget: dailyEnergyBudget !== undefined ? parseFloat(dailyEnergyBudget) : undefined,
        monthlyEnergyBudget: monthlyEnergyBudget !== undefined ? parseFloat(monthlyEnergyBudget) : undefined,
      };

      const result = await AreaConfigService.updateAreaConfig(id, data, user.userId);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('区域配置不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(result, '区域配置更新成功'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteAreaConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以删除区域配置', HttpStatus.FORBIDDEN));
      }

      const result = await AreaConfigService.deleteAreaConfig(id);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('区域配置不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '区域配置删除成功'));
    } catch (err) {
      next(err);
    }
  }

  static async lockAreaConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以锁定区域配置', HttpStatus.FORBIDDEN));
      }

      const areaConfig = await AreaConfigService.getAreaConfigDetail(id);
      if (!areaConfig) {
        return res.status(HttpStatus.NOT_FOUND).json(error('区域配置不存在', HttpStatus.NOT_FOUND));
      }

      const result = await AreaConfigService.lockAreaConfig(
        areaConfig.areaName,
        reason || '管理员手动锁定',
        user.userId
      );

      return res.json(success(result, '区域配置锁定成功'));
    } catch (err) {
      next(err);
    }
  }

  static async unlockAreaConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以解锁区域配置', HttpStatus.FORBIDDEN));
      }

      const areaConfig = await AreaConfigService.getAreaConfigDetail(id);
      if (!areaConfig) {
        return res.status(HttpStatus.NOT_FOUND).json(error('区域配置不存在', HttpStatus.NOT_FOUND));
      }

      const result = await AreaConfigService.unlockAreaConfig(areaConfig.areaName, user.userId);

      return res.json(success(result, '区域配置解锁成功'));
    } catch (err) {
      next(err);
    }
  }
}

export default AreaConfigController;
