import { Request, Response, NextFunction } from 'express';
import { PartService, CreatePartData, UpdatePartData, PartFilters } from '../services/part.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';

export class PartController {
  static async createPart(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, category, unit, stock, minStock, price, supplier } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以创建配件', HttpStatus.FORBIDDEN));
      }

      if (!code || !name) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数：编码和名称', HttpStatus.BAD_REQUEST));
      }

      const data: CreatePartData = {
        code,
        name,
        category,
        unit,
        stock: stock ? parseInt(stock) : undefined,
        minStock: minStock ? parseInt(minStock) : undefined,
        price: price ? parseFloat(price) : undefined,
        supplier,
      };

      const part = await PartService.createPart(data);

      return res.status(HttpStatus.CREATED).json(success(part, '配件创建成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getPartList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        code,
        name,
        category,
        supplier,
        lowStock,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: PartFilters = {
        code: code as string,
        name: name as string,
        category: category as string,
        supplier: supplier as string,
        lowStock: lowStock === 'true',
      };

      const result = await PartService.getPartList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getPartDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const part = await PartService.getPartDetail(id);

      if (!part) {
        return res.status(HttpStatus.NOT_FOUND).json(error('配件不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(part));
    } catch (err) {
      next(err);
    }
  }

  static async updatePart(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, category, unit, minStock, price, supplier } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以更新配件', HttpStatus.FORBIDDEN));
      }

      const data: UpdatePartData = {
        name,
        category,
        unit,
        minStock: minStock ? parseInt(minStock) : undefined,
        price: price ? parseFloat(price) : undefined,
        supplier,
      };

      const part = await PartService.updatePart(id, data);

      if (!part) {
        return res.status(HttpStatus.NOT_FOUND).json(error('配件不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(part, '配件更新成功'));
    } catch (err) {
      next(err);
    }
  }

  static async deletePart(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以删除配件', HttpStatus.FORBIDDEN));
      }

      const result = await PartService.deletePart(id);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json(error('配件不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '配件删除成功'));
    } catch (err) {
      next(err);
    }
  }

  static async addStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, remark } = req.body;
      const user = (req as any).user;

      if (user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('只有管理员可以增加库存', HttpStatus.FORBIDDEN));
      }

      if (!quantity || parseInt(quantity) <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('库存数量必须大于0', HttpStatus.BAD_REQUEST));
      }

      const part = await PartService.addStock(id, parseInt(quantity), remark);

      if (!part) {
        return res.status(HttpStatus.NOT_FOUND).json(error('配件不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(part, '库存增加成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getLowStockParts(req: Request, res: Response, next: NextFunction) {
    try {
      const parts = await PartService.getLowStockParts();

      return res.json(success(parts));
    } catch (err) {
      next(err);
    }
  }
}

export default PartController;
