import { AppDataSource } from '../config/database';
import { Part } from '../entities/Part';
import { PartUsageRecord } from '../entities/PartUsageRecord';


const partRepository = AppDataSource.getRepository(Part);
const partUsageRecordRepository = AppDataSource.getRepository(PartUsageRecord);

export interface CreatePartData {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  stock?: number;
  minStock?: number;
  price?: number;
  supplier?: string;
}

export interface UpdatePartData {
  name?: string;
  category?: string;
  unit?: string;
  minStock?: number;
  price?: number;
  supplier?: string;
}

export interface PartFilters {
  code?: string;
  name?: string;
  category?: string;
  supplier?: string;
  lowStock?: boolean;
}

export class PartService {
  static async createPart(data: CreatePartData): Promise<Part> {
    const existingPart = await partRepository.findOne({
      where: { code: data.code },
    });

    if (existingPart) {
      throw new Error('配件编码已存在');
    }

    const part = partRepository.create({
      code: data.code,
      name: data.name,
      category: data.category,
      unit: data.unit,
      stock: data.stock || 0,
      minStock: data.minStock || 0,
      price: data.price || 0,
      supplier: data.supplier,
    });

    return await partRepository.save(part);
  }

  static async updatePart(id: string, data: UpdatePartData): Promise<Part | null> {
    const part = await partRepository.findOne({ where: { id } });

    if (!part) {
      return null;
    }

    if (data.name !== undefined) part.name = data.name;
    if (data.category !== undefined) part.category = data.category;
    if (data.unit !== undefined) part.unit = data.unit;
    if (data.minStock !== undefined) part.minStock = data.minStock;
    if (data.price !== undefined) part.price = data.price;
    if (data.supplier !== undefined) part.supplier = data.supplier;

    return await partRepository.save(part);
  }

  static async deletePart(id: string): Promise<boolean> {
    const part = await partRepository.findOne({ where: { id } });

    if (!part) {
      return false;
    }

    const usageCount = await partUsageRecordRepository.count({
      where: { partId: id },
    });

    if (usageCount > 0) {
      throw new Error('该配件已有使用记录，无法删除');
    }

    await partRepository.delete(id);
    return true;
  }

  static async getPartList(
    filters: PartFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: Part[]; total: number }> {
    let query = partRepository.createQueryBuilder('part');

    if (filters.code) {
      query = query.andWhere('part.code LIKE :code', { code: `%${filters.code}%` });
    }
    if (filters.name) {
      query = query.andWhere('part.name LIKE :name', { name: `%${filters.name}%` });
    }
    if (filters.category) {
      query = query.andWhere('part.category = :category', { category: filters.category });
    }
    if (filters.supplier) {
      query = query.andWhere('part.supplier LIKE :supplier', { supplier: `%${filters.supplier}%` });
    }
    if (filters.lowStock) {
      query = query.andWhere('part.stock <= part.minStock');
      query = query.andWhere('part.minStock > 0');
    }

    const [items, total] = await query
      .orderBy('part.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total };
  }

  static async getPartDetail(id: string): Promise<Part | null> {
    return partRepository.findOne({ where: { id } });
  }

  static async checkStock(partId: string, quantity: number): Promise<{ sufficient: boolean; currentStock: number }> {
    const part = await partRepository.findOne({ where: { id: partId } });

    if (!part) {
      throw new Error('配件不存在');
    }

    return {
      sufficient: part.stock >= quantity,
      currentStock: part.stock,
    };
  }

  static async deductStock(
    partId: string,
    quantity: number,
    workOrderId: string,
    maintainerId: string
  ): Promise<PartUsageRecord> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const part = await transactionalEntityManager.findOne(Part, {
        where: { id: partId },
      });

      if (!part) {
        throw new Error('配件不存在');
      }

      if (part.stock < quantity) {
        throw new Error(`配件 ${part.name} 库存不足，当前库存：${part.stock}，需要：${quantity}`);
      }

      part.stock -= quantity;
      await transactionalEntityManager.save(part);

      const usageRecord = transactionalEntityManager.create(PartUsageRecord, {
        partId,
        workOrderId,
        quantity,
        usedAt: new Date(),
        maintainerId,
      });

      return await transactionalEntityManager.save(usageRecord);
    });
  }

  static async addStock(partId: string, quantity: number, remark?: string): Promise<Part | null> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const part = await transactionalEntityManager.findOne(Part, {
        where: { id: partId },
      });

      if (!part) {
        return null;
      }

      if (quantity <= 0) {
        throw new Error('增加的库存数量必须大于0');
      }

      part.stock += quantity;
      return await transactionalEntityManager.save(part);
    });
  }

  static async getLowStockParts(): Promise<Part[]> {
    return partRepository
      .createQueryBuilder('part')
      .where('part.stock <= part.minStock')
      .andWhere('part.minStock > 0')
      .orderBy('part.stock', 'ASC')
      .getMany();
  }
}

export default PartService;
