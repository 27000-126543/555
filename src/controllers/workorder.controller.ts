import { Request, Response, NextFunction } from 'express';
import { WorkOrderService, CompleteWorkOrderData, WorkOrderFilters } from '../services/workorder.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { WorkOrderStatus } from '../entities/WorkOrder';
import { FaultLevel } from '../entities/Inspection';
import * as fs from 'fs';
import * as path from 'path';

export class WorkOrderController {
  static async getWorkOrderList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        maintainerId,
        faultType,
        faultLevel,
        area,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: WorkOrderFilters = {
        status: status as WorkOrderStatus,
        maintainerId: maintainerId as string,
        faultType: faultType as string,
        faultLevel: faultLevel as FaultLevel,
        area: area as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const result = await WorkOrderService.getWorkOrderList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getWorkOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const workOrder = await WorkOrderService.getWorkOrderDetail(id);

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder));
    } catch (err) {
      next(err);
    }
  }

  static async assignWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { maintainerId } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以分配工单', HttpStatus.FORBIDDEN));
      }

      if (!maintainerId) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少维修员ID', HttpStatus.BAD_REQUEST));
      }

      const workOrder = await WorkOrderService.assignWorkOrder(id, maintainerId);

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder, '工单分配成功'));
    } catch (err) {
      next(err);
    }
  }

  static async acceptWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (user.role !== 'maintainer') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以接单', HttpStatus.FORBIDDEN));
      }

      const workOrder = await WorkOrderService.acceptWorkOrder(id, user.id);

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder, '接单成功'));
    } catch (err) {
      next(err);
    }
  }

  static async startWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { lightCode } = req.body;
      const user = (req as any).user;

      if (user.role !== 'maintainer') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以开始维修', HttpStatus.FORBIDDEN));
      }

      if (!lightCode) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少路灯编码', HttpStatus.BAD_REQUEST));
      }

      const workOrder = await WorkOrderService.startWorkOrder(id, user.id, lightCode);

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder, '开始维修'));
    } catch (err) {
      next(err);
    }
  }

  static async completeWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { description, photos, report, partsUsed, partsCost, laborCost } = req.body;
      const user = (req as any).user;

      if (user.role !== 'maintainer') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有维修员可以完成工单', HttpStatus.FORBIDDEN));
      }

      if (!description || !photos || !report) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: CompleteWorkOrderData = {
        description,
        photos: Array.isArray(photos) ? photos : [photos],
        report,
        partsUsed,
        partsCost: partsCost ? parseFloat(partsCost) : 0,
        laborCost: laborCost ? parseFloat(laborCost) : 0,
      };

      const workOrder = await WorkOrderService.completeWorkOrder(id, user.id, data);

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder, '工单已提交审核'));
    } catch (err) {
      next(err);
    }
  }

  static async verifyWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { pass, remark } = req.body;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以审核工单', HttpStatus.FORBIDDEN));
      }

      if (pass === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少审核结果', HttpStatus.BAD_REQUEST));
      }

      const workOrder = await WorkOrderService.verifyWorkOrder(id, user.id, pass, remark || '');

      if (!workOrder) {
        return res.status(HttpStatus.NOT_FOUND).json(error('工单不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(workOrder, `审核${pass ? '通过' : '未通过'}`));
    } catch (err) {
      next(err);
    }
  }

  static async downloadVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const filePath = await WorkOrderService.generateWorkOrderVoucher(id);

      if (!fs.existsSync(filePath)) {
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

export default WorkOrderController;
