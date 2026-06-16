import { AppDataSource } from '../config/database';
import { AreaConfig } from '../entities/AreaConfig';
import { User, UserRole } from '../entities/User';
import { FindOptionsWhere, Like } from 'typeorm';

const areaConfigRepository = AppDataSource.getRepository(AreaConfig);
const userRepository = AppDataSource.getRepository(User);

export interface CreateAreaConfigData {
  areaName: string;
  lightOnTime: string;
  lightOffTime: string;
  dailyEnergyBudget: number;
  monthlyEnergyBudget: number;
}

export interface UpdateAreaConfigData {
  lightOnTime?: string;
  lightOffTime?: string;
  dailyEnergyBudget?: number;
  monthlyEnergyBudget?: number;
}

export interface AreaConfigFilters {
  areaName?: string;
  isLocked?: boolean;
}

export class AreaConfigService {
  static async createAreaConfig(data: CreateAreaConfigData): Promise<AreaConfig> {
    const existing = await areaConfigRepository.findOne({
      where: { areaName: data.areaName },
    });
    if (existing) {
      throw new Error('该区域配置已存在');
    }

    const areaConfig = areaConfigRepository.create({
      ...data,
      isLocked: false,
    });

    return areaConfigRepository.save(areaConfig);
  }

  static async updateAreaConfig(
    id: string,
    data: UpdateAreaConfigData,
    userId: string
  ): Promise<AreaConfig | null> {
    const areaConfig = await areaConfigRepository.findOne({ where: { id } });
    if (!areaConfig) {
      return null;
    }

    if (areaConfig.isLocked) {
      const user = await userRepository.findOne({
        where: { id: userId, role: UserRole.ADMIN, status: true },
      });
      if (!user) {
        throw new Error('区域配置已锁定，只有管理员可以修改');
      }
    }

    if (data.lightOnTime !== undefined) {
      areaConfig.lightOnTime = data.lightOnTime;
    }
    if (data.lightOffTime !== undefined) {
      areaConfig.lightOffTime = data.lightOffTime;
    }
    if (data.dailyEnergyBudget !== undefined) {
      areaConfig.dailyEnergyBudget = data.dailyEnergyBudget;
    }
    if (data.monthlyEnergyBudget !== undefined) {
      areaConfig.monthlyEnergyBudget = data.monthlyEnergyBudget;
    }

    return areaConfigRepository.save(areaConfig);
  }

  static async deleteAreaConfig(id: string): Promise<boolean> {
    const result = await areaConfigRepository.delete(id);
    return result.affected !== undefined && result.affected !== null && result.affected > 0;
  }

  static async getAreaConfigList(
    filters: AreaConfigFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: AreaConfig[]; total: number }> {
    const where: FindOptionsWhere<AreaConfig> = {};

    if (filters.areaName) {
      where.areaName = Like(`%${filters.areaName}%`);
    }
    if (filters.isLocked !== undefined) {
      where.isLocked = filters.isLocked;
    }

    const [items, total] = await areaConfigRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  static async getAreaConfigDetail(id: string): Promise<AreaConfig | null> {
    return areaConfigRepository.findOne({ where: { id } });
  }

  static async getAreaConfigByArea(areaName: string): Promise<AreaConfig | null> {
    return areaConfigRepository.findOne({ where: { areaName } });
  }

  static async lockAreaConfig(
    area: string,
    reason: string,
    adminId: string
  ): Promise<AreaConfig | null> {
    const admin = await userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN, status: true },
    });
    if (!admin) {
      throw new Error('只有管理员可以锁定区域配置');
    }

    const areaConfig = await areaConfigRepository.findOne({ where: { areaName: area } });
    if (!areaConfig) {
      return null;
    }

    areaConfig.isLocked = true;
    areaConfig.lockReason = reason;

    return areaConfigRepository.save(areaConfig);
  }

  static async unlockAreaConfig(
    area: string,
    adminId: string
  ): Promise<AreaConfig | null> {
    const admin = await userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN, status: true },
    });
    if (!admin) {
      throw new Error('只有管理员可以解锁区域配置');
    }

    const areaConfig = await areaConfigRepository.findOne({ where: { areaName: area } });
    if (!areaConfig) {
      return null;
    }

    areaConfig.isLocked = false;
    areaConfig.lockReason = '';

    return areaConfigRepository.save(areaConfig);
  }
}

export default AreaConfigService;
