import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { StreetLight, StreetLightStatus } from '../entities/StreetLight';
import { Part } from '../entities/Part';
import { AreaConfig } from '../entities/AreaConfig';
import { areas } from '../data/areas';

const DEFAULT_PASSWORD = '123456';

const defaultUsers = [
  {
    username: 'admin',
    realName: '系统管理员',
    role: UserRole.ADMIN,
    phone: '13800138000',
    email: 'admin@example.com',
    area: '朝阳区',
  },
  {
    username: 'inspector',
    realName: '巡检员',
    role: UserRole.INSPECTOR,
    phone: '13800138001',
    email: 'inspector@example.com',
    area: '朝阳区',
  },
  {
    username: 'maintainer',
    realName: '维修员',
    role: UserRole.MAINTAINER,
    phone: '13800138002',
    email: 'maintainer@example.com',
    area: '海淀区',
  },
  {
    username: 'finance',
    realName: '财务人员',
    role: UserRole.FINANCE,
    phone: '13800138003',
    email: 'finance@example.com',
    area: '朝阳区',
  },
];

const streetLightsData = [
  { code: 'LD-CY-001', area: '朝阳区', address: '建国路1号', lng: 116.4551, lat: 39.9089, model: 'LED-100W', power: 100 },
  { code: 'LD-CY-002', area: '朝阳区', address: '建国路2号', lng: 116.4562, lat: 39.9091, model: 'LED-100W', power: 100 },
  { code: 'LD-HD-001', area: '海淀区', address: '中关村大街1号', lng: 116.3180, lat: 39.9837, model: 'LED-150W', power: 150 },
  { code: 'LD-HD-002', area: '海淀区', address: '中关村大街2号', lng: 116.3185, lat: 39.9842, model: 'LED-150W', power: 150 },
  { code: 'LD-DC-001', area: '东城区', address: '王府井大街1号', lng: 116.4103, lat: 39.9139, model: 'LED-80W', power: 80 },
  { code: 'LD-XC-001', area: '西城区', address: '西单北大街1号', lng: 116.3720, lat: 39.9133, model: 'LED-80W', power: 80 },
  { code: 'LD-FT-001', area: '丰台区', address: '丰台路1号', lng: 116.2869, lat: 39.8585, model: 'LED-100W', power: 100 },
  { code: 'LD-FT-002', area: '丰台区', address: '丰台路2号', lng: 116.2875, lat: 39.8590, model: 'LED-100W', power: 100 },
  { code: 'LD-SJS-001', area: '石景山区', address: '石景山路1号', lng: 116.2229, lat: 39.9057, model: 'LED-120W', power: 120 },
  { code: 'LD-TZ-001', area: '通州区', address: '新华大街1号', lng: 116.6568, lat: 39.9088, model: 'LED-100W', power: 100 },
];

const partsData = [
  { code: 'PJ-001', name: 'LED灯泡(100W)', category: '光源', unit: '个', stock: 50, minStock: 10, price: 80.00, supplier: '北京照明科技有限公司' },
  { code: 'PJ-002', name: '镇流器', category: '电器', unit: '个', stock: 30, minStock: 5, price: 200.00, supplier: '上海电子元件厂' },
  { code: 'PJ-003', name: '控制器', category: '电子', unit: '个', stock: 20, minStock: 5, price: 350.00, supplier: '深圳智能科技有限公司' },
  { code: 'PJ-004', name: '灯罩', category: '配件', unit: '个', stock: 40, minStock: 8, price: 120.00, supplier: '河北塑料制品厂' },
  { code: 'PJ-005', name: '电线(米)', category: '材料', unit: '米', stock: 500, minStock: 100, price: 5.00, supplier: '北京电缆厂' },
];

const areaConfigsData = [
  { areaName: '朝阳区', lightOnTime: '18:00', lightOffTime: '06:00', dailyEnergyBudget: 100, monthlyEnergyBudget: 3000 },
  { areaName: '海淀区', lightOnTime: '18:00', lightOffTime: '06:00', dailyEnergyBudget: 80, monthlyEnergyBudget: 2400 },
  { areaName: '东城区', lightOnTime: '18:30', lightOffTime: '05:30', dailyEnergyBudget: 60, monthlyEnergyBudget: 1800 },
];

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const createDefaultUsers = async (): Promise<User[]> => {
  const userRepository = AppDataSource.getRepository(User);
  const createdUsers: User[] = [];

  for (const userData of defaultUsers) {
    const existing = await userRepository.findOne({ where: { username: userData.username } });
    if (!existing) {
      const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
      const user = userRepository.create({
        ...userData,
        password: hashedPassword,
        status: true,
      });
      const saved = await userRepository.save(user);
      createdUsers.push(saved);
      console.log(`[SEED] Created user: ${userData.username}`);
    } else {
      console.log(`[SEED] User already exists: ${userData.username}`);
    }
  }

  return createdUsers;
};

export const createStreetLights = async (): Promise<StreetLight[]> => {
  const lightRepository = AppDataSource.getRepository(StreetLight);
  const createdLights: StreetLight[] = [];

  for (const lightData of streetLightsData) {
    const existing = await lightRepository.findOne({ where: { code: lightData.code } });
    if (!existing) {
      const light = lightRepository.create({
        ...lightData,
        installDate: new Date('2023-01-01'),
        status: StreetLightStatus.NORMAL,
        brightness: 100,
      });
      const saved = await lightRepository.save(light);
      createdLights.push(saved);
      console.log(`[SEED] Created street light: ${lightData.code}`);
    } else {
      console.log(`[SEED] Street light already exists: ${lightData.code}`);
    }
  }

  return createdLights;
};

export const createParts = async (): Promise<Part[]> => {
  const partRepository = AppDataSource.getRepository(Part);
  const createdParts: Part[] = [];

  for (const partData of partsData) {
    const existing = await partRepository.findOne({ where: { code: partData.code } });
    if (!existing) {
      const part = partRepository.create(partData);
      const saved = await partRepository.save(part);
      createdParts.push(saved);
      console.log(`[SEED] Created part: ${partData.code} - ${partData.name}`);
    } else {
      console.log(`[SEED] Part already exists: ${partData.code} - ${partData.name}`);
    }
  }

  return createdParts;
};

export const createAreaConfigs = async (): Promise<AreaConfig[]> => {
  const areaConfigRepository = AppDataSource.getRepository(AreaConfig);
  const createdConfigs: AreaConfig[] = [];

  for (const configData of areaConfigsData) {
    const existing = await areaConfigRepository.findOne({ where: { areaName: configData.areaName } });
    if (!existing) {
      const config = areaConfigRepository.create({
        ...configData,
        isLocked: false,
      });
      const saved = await areaConfigRepository.save(config);
      createdConfigs.push(saved);
      console.log(`[SEED] Created area config: ${configData.areaName}`);
    } else {
      console.log(`[SEED] Area config already exists: ${configData.areaName}`);
    }
  }

  return createdConfigs;
};

export const seed = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('[SEED] Database connected');
    }

    console.log('[SEED] Starting data seeding...');
    console.log('==================================');

    await createDefaultUsers();
    await createStreetLights();
    await createParts();
    await createAreaConfigs();

    console.log('==================================');
    console.log('[SEED] Data seeding completed successfully!');
    console.log('[SEED] Default accounts created:');
    console.log('  - admin / 123456 (系统管理员)');
    console.log('  - inspector / 123456 (巡检员)');
    console.log('  - maintainer / 123456 (维修员)');
    console.log('  - finance / 123456 (财务人员)');
  } catch (error) {
    console.error('[SEED] Error during data seeding:', error);
    throw error;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('[SEED] Clearing all data...');

    await AppDataSource.getRepository('Notification').delete({});
    await AppDataSource.getRepository('MaintenanceRecord').delete({});
    await AppDataSource.getRepository('WorkOrder').delete({});
    await AppDataSource.getRepository('Inspection').delete({});
    await AppDataSource.getRepository('EnergyAlert').delete({});
    await AppDataSource.getRepository('EnergyConsumption').delete({});
    await AppDataSource.getRepository('StreetLight').delete({});
    await AppDataSource.getRepository('Part').delete({});
    await AppDataSource.getRepository('AreaConfig').delete({});
    await AppDataSource.getRepository('User').delete({});

    console.log('[SEED] All data cleared successfully!');
  } catch (error) {
    console.error('[SEED] Error clearing data:', error);
    throw error;
  }
};

export const reseed = async (): Promise<void> => {
  await clearAllData();
  await seed();
};

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default {
  seed,
  clearAllData,
  reseed,
  createDefaultUsers,
  createStreetLights,
  createParts,
  createAreaConfigs,
};
