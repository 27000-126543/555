import { Request, Response, NextFunction } from 'express';
import { InspectionService, CreateInspectionData, UpdateInspectionData, InspectionFilters } from '../services/inspection.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { FaultLevel } from '../entities/Inspection';

export class InspectionController {
  static async createInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'inspector') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有巡检员可以创建巡检记录', HttpStatus.FORBIDDEN));
      }

      const { streetLightId, inspectDate, faultType, faultLevel, description, images } = req.body;

      if (!streetLightId || !inspectDate) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: CreateInspectionData = {
        streetLightId,
        inspectDate: new Date(inspectDate),
        faultType,
        faultLevel: faultLevel as FaultLevel,
        description,
        images,
      };

      const inspection = await InspectionService.createInspection(user.userId, data);

      return res.status(HttpStatus.CREATED).json(success(inspection, '巡检记录创建成功', HttpStatus.CREATED));
    } catch (err) {
      next(err);
    }
  }

  static async getInspectionList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        inspectorId,
        streetLightId,
        faultType,
        faultLevel,
        startDate,
        endDate,
        keyword,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: InspectionFilters = {
        inspectorId: inspectorId as string,
        streetLightId: streetLightId as string,
        faultType: faultType as string,
        faultLevel: faultLevel as FaultLevel,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        keyword: keyword as string,
      };

      const result = await InspectionService.getInspectionList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getInspectionDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const inspection = await InspectionService.getInspectionDetail(id);

      if (!inspection) {
        return res.status(HttpStatus.NOT_FOUND).json(error('巡检记录不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(inspection));
    } catch (err) {
      next(err);
    }
  }

  static async updateInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { streetLightId, inspectDate, faultType, faultLevel, description, images } = req.body;
      const user = (req as any).user;

      const existing = await InspectionService.getInspectionDetail(id);
      if (!existing) {
        return res.status(HttpStatus.NOT_FOUND).json(error('巡检记录不存在', HttpStatus.NOT_FOUND));
      }

      if (user.role !== 'admin' && existing.inspectorId !== user.userId) {
        return res.status(HttpStatus.FORBIDDEN).json(error('无权修改此巡检记录', HttpStatus.FORBIDDEN));
      }

      const data: UpdateInspectionData = {
        streetLightId,
        inspectDate: inspectDate ? new Date(inspectDate) : undefined,
        faultType,
        faultLevel: faultLevel as FaultLevel,
        description,
        images,
      };

      const inspection = await InspectionService.updateInspection(id, data);

      return res.json(success(inspection, '巡检记录更新成功'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const existing = await InspectionService.getInspectionDetail(id);
      if (!existing) {
        return res.status(HttpStatus.NOT_FOUND).json(error('巡检记录不存在', HttpStatus.NOT_FOUND));
      }

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以删除巡检记录', HttpStatus.FORBIDDEN));
      }

      const deleted = await InspectionService.deleteInspection(id);

      if (!deleted) {
        return res.status(HttpStatus.NOT_FOUND).json(error('删除失败', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '巡检记录删除成功'));
    } catch (err) {
      next(err);
    }
  }
}

export default InspectionController;
