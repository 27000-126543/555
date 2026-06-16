import { AppDataSource } from '../config/database';
import { Inspection, FaultLevel } from '../entities/Inspection';
import { StreetLight } from '../entities/StreetLight';
import { WorkOrderService } from './workorder.service';
import { Between, FindOptionsWhere } from 'typeorm';

const inspectionRepository = AppDataSource.getRepository(Inspection);
const streetLightRepository = AppDataSource.getRepository(StreetLight);

export interface CreateInspectionData {
  streetLightId: string;
  inspectDate: Date;
  faultType?: string;
  faultLevel?: FaultLevel;
  description?: string;
  images?: string[];
}

export interface UpdateInspectionData {
  streetLightId?: string;
  inspectDate?: Date;
  faultType?: string;
  faultLevel?: FaultLevel;
  description?: string;
  images?: string[];
}

export interface InspectionFilters {
  inspectorId?: string;
  streetLightId?: string;
  faultType?: string;
  faultLevel?: FaultLevel;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
}

export interface InspectionStats {
  total: number;
  withFault: number;
  faultRate: number;
  byLevel: {
    low: number;
    medium: number;
    urgent: number;
  };
  byType: Record<string, number>;
}

export class InspectionService {
  static async createInspection(inspectorId: string, data: CreateInspectionData): Promise<Inspection> {
    const streetLight = await streetLightRepository.findOne({
      where: { id: data.streetLightId },
    });
    if (!streetLight) {
      throw new Error('路灯不存在');
    }

    const inspection = inspectionRepository.create({
      inspectorId,
      streetLightId: data.streetLightId,
      inspectDate: data.inspectDate,
      faultType: data.faultType,
      faultLevel: data.faultLevel,
      description: data.description,
      images: data.images || [],
    });

    const savedInspection = await inspectionRepository.save(inspection);

    if (data.faultType && data.faultLevel) {
      await WorkOrderService.createWorkOrderFromInspection(savedInspection);
    }

    return savedInspection;
  }

  static async getInspectionList(
    filters: InspectionFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: Inspection[]; total: number }> {
    const where: FindOptionsWhere<Inspection> = {};

    if (filters.inspectorId) {
      where.inspectorId = filters.inspectorId;
    }
    if (filters.streetLightId) {
      where.streetLightId = filters.streetLightId;
    }
    if (filters.faultType) {
      where.faultType = filters.faultType;
    }
    if (filters.faultLevel) {
      where.faultLevel = filters.faultLevel;
    }
    if (filters.startDate && filters.endDate) {
      where.inspectDate = Between(filters.startDate, filters.endDate);
    }

    const [items, total] = await inspectionRepository.findAndCount({
      where,
      relations: ['inspector', 'streetLight'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  static async getInspectionDetail(id: string): Promise<Inspection | null> {
    return inspectionRepository.findOne({
      where: { id },
      relations: ['inspector', 'streetLight'],
    });
  }

  static async updateInspection(
    id: string,
    data: UpdateInspectionData
  ): Promise<Inspection | null> {
    const inspection = await inspectionRepository.findOne({ where: { id } });
    if (!inspection) {
      return null;
    }

    if (data.streetLightId) {
      const streetLight = await streetLightRepository.findOne({
        where: { id: data.streetLightId },
      });
      if (!streetLight) {
        throw new Error('路灯不存在');
      }
    }

    Object.assign(inspection, data);
    return inspectionRepository.save(inspection);
  }

  static async deleteInspection(id: string): Promise<boolean> {
    const result = await inspectionRepository.delete(id);
    return result.affected !== undefined && result.affected !== null && result.affected > 0;
  }

  static async getInspectionStats(
    inspectorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<InspectionStats> {
    const where: FindOptionsWhere<Inspection> = {};

    if (inspectorId) {
      where.inspectorId = inspectorId;
    }
    if (startDate && endDate) {
      where.inspectDate = Between(startDate, endDate);
    }

    const inspections = await inspectionRepository.find({ where });

    const total = inspections.length;
    const withFault = inspections.filter((i) => i.faultType).length;
    const faultRate = total > 0 ? withFault / total : 0;

    const byLevel = {
      low: inspections.filter((i) => i.faultLevel === FaultLevel.LOW).length,
      medium: inspections.filter((i) => i.faultLevel === FaultLevel.MEDIUM).length,
      urgent: inspections.filter((i) => i.faultLevel === FaultLevel.URGENT).length,
    };

    const byType: Record<string, number> = {};
    inspections.forEach((i) => {
      if (i.faultType) {
        byType[i.faultType] = (byType[i.faultType] || 0) + 1;
      }
    });

    return {
      total,
      withFault,
      faultRate,
      byLevel,
      byType,
    };
  }
}

export default InspectionService;
