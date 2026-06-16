import { AppDataSource } from '../config/database';
import { StreetLight, StreetLightStatus } from '../entities/StreetLight';
import { WorkOrder, WorkOrderStatus } from '../entities/WorkOrder';
import { FindOptionsWhere, Like, In } from 'typeorm';

const streetLightRepository = AppDataSource.getRepository(StreetLight);
const workOrderRepository = AppDataSource.getRepository(WorkOrder);

export interface CreateStreetLightData {
  code: string;
  area: string;
  address: string;
  lng?: number;
  lat?: number;
  model?: string;
  installDate?: Date;
  status?: StreetLightStatus;
  brightness?: number;
  power?: number;
}

export interface UpdateStreetLightData {
  area?: string;
  address?: string;
  lng?: number;
  lat?: number;
  model?: string;
  installDate?: Date;
  brightness?: number;
  power?: number;
}

export interface StreetLightFilters {
  code?: string;
  area?: string;
  status?: StreetLightStatus;
  address?: string;
}

export interface LightStats {
  total: number;
  normal: number;
  fault: number;
  maintaining: number;
}

export class StreetLightService {
  static async createStreetLight(data: CreateStreetLightData): Promise<StreetLight> {
    const existingLight = await streetLightRepository.findOne({
      where: { code: data.code },
    });

    if (existingLight) {
      throw new Error('路灯编码已存在');
    }

    const streetLight = streetLightRepository.create({
      code: data.code,
      area: data.area,
      address: data.address,
      lng: data.lng,
      lat: data.lat,
      model: data.model,
      installDate: data.installDate,
      status: data.status || StreetLightStatus.NORMAL,
      brightness: data.brightness || 100,
      power: data.power || 0,
    });

    return await streetLightRepository.save(streetLight);
  }

  static async updateStreetLight(
    id: string,
    data: UpdateStreetLightData
  ): Promise<StreetLight | null> {
    const streetLight = await streetLightRepository.findOne({ where: { id } });

    if (!streetLight) {
      return null;
    }

    if (data.area !== undefined) streetLight.area = data.area;
    if (data.address !== undefined) streetLight.address = data.address;
    if (data.lng !== undefined) streetLight.lng = data.lng;
    if (data.lat !== undefined) streetLight.lat = data.lat;
    if (data.model !== undefined) streetLight.model = data.model;
    if (data.installDate !== undefined) streetLight.installDate = data.installDate;
    if (data.brightness !== undefined) streetLight.brightness = data.brightness;
    if (data.power !== undefined) streetLight.power = data.power;

    return await streetLightRepository.save(streetLight);
  }

  static async deleteStreetLight(id: string): Promise<boolean> {
    const streetLight = await streetLightRepository.findOne({ where: { id } });

    if (!streetLight) {
      return false;
    }

    const activeWorkOrder = await workOrderRepository.findOne({
      where: {
        streetLightId: id,
        status: In([
          WorkOrderStatus.PENDING,
          WorkOrderStatus.ASSIGNED,
          WorkOrderStatus.ACCEPTED,
          WorkOrderStatus.PROCESSING,
        ]),
      },
    });

    if (activeWorkOrder) {
      throw new Error('该路灯存在未完成的工单，无法删除');
    }

    await streetLightRepository.delete(id);
    return true;
  }

  static async getStreetLightList(
    filters: StreetLightFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: StreetLight[]; total: number }> {
    const where: FindOptionsWhere<StreetLight> = {};

    if (filters.code) {
      where.code = Like(`%${filters.code}%`);
    }
    if (filters.area) {
      where.area = filters.area;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.address) {
      where.address = Like(`%${filters.address}%`);
    }

    const [items, total] = await streetLightRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  static async getStreetLightDetail(id: string): Promise<StreetLight | null> {
    return streetLightRepository.findOne({ where: { id } });
  }

  static async updateLightStatus(
    id: string,
    status: StreetLightStatus
  ): Promise<StreetLight | null> {
    const streetLight = await streetLightRepository.findOne({ where: { id } });

    if (!streetLight) {
      return null;
    }

    streetLight.status = status;
    return await streetLightRepository.save(streetLight);
  }

  static async getLightByCode(code: string): Promise<StreetLight | null> {
    return streetLightRepository.findOne({ where: { code } });
  }

  static async getLightsByArea(area: string): Promise<StreetLight[]> {
    return streetLightRepository.find({
      where: { area },
      order: { code: 'ASC' },
    });
  }

  static async getLightStats(area?: string): Promise<LightStats> {
    let query = streetLightRepository.createQueryBuilder('streetLight');

    if (area) {
      query = query.where('streetLight.area = :area', { area });
    }

    const streetLights = await query.getMany();

    const stats: LightStats = {
      total: streetLights.length,
      normal: 0,
      fault: 0,
      maintaining: 0,
    };

    streetLights.forEach((light) => {
      switch (light.status) {
        case StreetLightStatus.NORMAL:
          stats.normal++;
          break;
        case StreetLightStatus.FAULT:
          stats.fault++;
          break;
        case StreetLightStatus.MAINTAINING:
          stats.maintaining++;
          break;
      }
    });

    return stats;
  }
}

export default StreetLightService;
