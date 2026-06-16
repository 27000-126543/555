import { Request, Response, NextFunction } from 'express';
import { MaintenanceService, PartCode, CompleteMaintenanceData, MaintenanceFilters } from '../services/maintenance.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';

export class MaintenanceController {
  static async scanQRCodeAndStart(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const { lightCode } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.MAINTAINER) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以开始维修', HttpStatus.FORBIDDEN));
      }

      if (!lightCode) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少路灯编码', HttpStatus.BAD_REQUEST));
      }

      const workOrder = await MaintenanceService.scanQRCodeAndStart(orderId, user.id, lightCode);

      return res.json(success(workOrder, '开始维修成功'));
    } catch (err) {
      next(err);
    }
  }

  static async useParts(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const { parts } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.MAINTAINER) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以使用配件', HttpStatus.FORBIDDEN));
      }

      if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少配件信息', HttpStatus.BAD_REQUEST));
      }

      const partCodes: PartCode[] = parts.map((p: any) => ({
        partId: p.partId,
        quantity: parseInt(p.quantity),
      }));

      const invalidParts = partCodes.filter((p) => !p.partId || !p.quantity || p.quantity <= 0);
      if (invalidParts.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('配件信息格式错误', HttpStatus.BAD_REQUEST));
      }

      const usageRecords = await MaintenanceService.validatePartAndRecordUsage(orderId, partCodes, user.id);

      return res.json(success(usageRecords, '配件使用成功'));
    } catch (err) {
      next(err);
    }
  }

  static async completeMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const { description, photos, report, laborCost } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.MAINTAINER) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以完成维修', HttpStatus.FORBIDDEN));
      }

      if (!description || !photos || !report) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: CompleteMaintenanceData = {
        description,
        photos: Array.isArray(photos) ? photos : [photos],
        report,
        laborCost: laborCost ? parseFloat(laborCost) : 0,
      };

      const maintenanceRecord = await MaintenanceService.completeMaintenance(orderId, user.id, data);

      return res.json(success(maintenanceRecord, '维修完成成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getMaintenanceList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        maintainerId,
        workOrderId,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: MaintenanceFilters = {
        maintainerId: maintainerId as string,
        workOrderId: workOrderId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const result = await MaintenanceService.getMaintenanceList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getMaintenanceDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const maintenanceRecord = await MaintenanceService.getMaintenanceRecord(id);

      if (!maintenanceRecord) {
        return res.status(HttpStatus.NOT_FOUND).json(error('维修记录不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(maintenanceRecord));
    } catch (err) {
      next(err);
    }
  }

  static async getMaintenanceByWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;

      const maintenanceRecord = await MaintenanceService.getMaintenanceByWorkOrder(orderId);

      if (!maintenanceRecord) {
        return res.status(HttpStatus.NOT_FOUND).json(error('该工单暂无维修记录', HttpStatus.NOT_FOUND));
      }

      return res.json(success(maintenanceRecord));
    } catch (err) {
      next(err);
    }
  }
}

export default MaintenanceController;
