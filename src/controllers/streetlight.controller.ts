import { Request, Response, NextFunction } from 'express';
import { StreetLightService, CreateStreetLightData, UpdateStreetLightData, StreetLightFilters } from '../services/streetlight.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';
import { StreetLightStatus } from '../entities/StreetLight';

export class StreetLightController {
  static async createStreetLight(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, area, address, lng, lat, model, installDate, status, brightness, power } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以创建路灯', HttpStatus.FORBIDDEN));
      }

      if (!code || !area || !address) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数：编码、区域、地址', HttpStatus.BAD_REQUEST));
      }

      const data: CreateStreetLightData = {
        code,
        area,
        address,
        lng: lng ? parseFloat(lng) : undefined,
        lat: lat ? parseFloat(lat) : undefined,
        model,
        installDate: installDate ? new Date(installDate) : undefined,
        status: status as StreetLightStatus,
        brightness: brightness ? parseInt(brightness) : undefined,
        power: power ? parseFloat(power) : undefined,
      };

      const streetLight = await StreetLightService.createStreetLight(data);

      return res.status(HttpStatus.CREATED).json(success(streetLight, '路灯创建成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getStreetLightList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        code,
        area,
        status,
        address,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: StreetLightFilters = {
        code: code as string,
        area: area as string,
        status: status as StreetLightStatus,
        address: address as string,
      };

      const result = await StreetLightService.getStreetLightList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getStreetLightDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const streetLight = await StreetLightService.getStreetLightDetail(id);

      if (!streetLight) {
        return res.status(HttpStatus.NOT_FOUND).json(error('路灯不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(streetLight));
    } catch (err) {
      next(err);
    }
  }

  static async updateStreetLight(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { area, address, lng, lat, model, installDate, brightness, power } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以更新路灯', HttpStatus.FORBIDDEN));
      }

      const data: UpdateStreetLightData = {
        area,
        address,
        lng: lng ? parseFloat(lng) : undefined,
        lat: lat ? parseFloat(lat) : undefined,
        model,
        installDate: installDate ? new Date(installDate) : undefined,
        brightness: brightness ? parseInt(brightness) : undefined,
        power: power ? parseFloat(power) : undefined,
      };

      const streetLight = await StreetLightService.updateStreetLight(id, data);

      if (!streetLight) {
        return res.status(HttpStatus.NOT_FOUND).json(error('路灯不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(streetLight, '路灯更新成功'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteStreetLight(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以删除路灯', HttpStatus.FORBIDDEN));
      }

      const result = await StreetLightService.deleteStreetLight(id);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('路灯不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '路灯删除成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getLightByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;

      const streetLight = await StreetLightService.getLightByCode(code);

      if (!streetLight) {
        return res.status(HttpStatus.NOT_FOUND).json(error('路灯不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(streetLight));
    } catch (err) {
      next(err);
    }
  }

  static async getLightStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { area } = req.query;

      const stats = await StreetLightService.getLightStats(area as string);

      return res.json(success(stats));
    } catch (err) {
      next(err);
    }
  }
}

export default StreetLightController;
