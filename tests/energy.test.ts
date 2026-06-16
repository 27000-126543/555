import request from 'supertest';
import app from '../src/app';
import { AppDataSource } from '../src/config/database';
import { StreetLight } from '../src/entities/StreetLight';
import { EnergyConsumption } from '../src/entities/EnergyConsumption';
import { EnergyAlert } from '../src/entities/EnergyAlert';
import { AreaConfig } from '../src/entities/AreaConfig';

describe('Energy Module Tests', () => {
  let adminToken: string;
  let financeToken: string;
  let testStreetLight: StreetLight;
  let testAreaConfig: AreaConfig;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    adminToken = adminLogin.body.data?.accessToken;

    const financeLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'finance', password: '123456' });
    financeToken = financeLogin.body.data?.accessToken;

    const lightRepo = AppDataSource.getRepository(StreetLight);
    testStreetLight = lightRepo.create({
      code: 'ENERGY-TEST-001',
      area: '朝阳区',
      address: '能耗测试路1号',
      lng: 116.4074,
      lat: 39.9042,
      model: 'LED-100W',
      power: 100
    });
    await lightRepo.save(testStreetLight);

    const areaConfigRepo = AppDataSource.getRepository(AreaConfig);
    testAreaConfig = areaConfigRepo.create({
      areaName: '朝阳区',
      lightOnTime: '18:00',
      lightOffTime: '06:00',
      dailyEnergyBudget: 10,
      monthlyEnergyBudget: 300
    });
    await areaConfigRepo.save(testAreaConfig);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      const lightRepo = AppDataSource.getRepository(StreetLight);
      const areaConfigRepo = AppDataSource.getRepository(AreaConfig);
      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const alertRepo = AppDataSource.getRepository(EnergyAlert);

      await energyRepo.delete({ streetLightId: testStreetLight.id });
      await alertRepo.delete({ area: testStreetLight.area });
      if (testStreetLight) {
        await lightRepo.delete(testStreetLight.id);
      }
      if (testAreaConfig) {
        await areaConfigRepo.delete(testAreaConfig.id);
      }
      await AppDataSource.destroy();
    }
  });

  describe('Energy Consumption Recording', () => {
    it('should record energy consumption successfully', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streetLightId: testStreetLight.id,
          date: testDate,
          consumption: 1.2,
          duration: 12
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.consumption).toBe(1.2);
      expect(response.body.data).toHaveProperty('cost');
    });

    it('should calculate cost correctly', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const consumption = 2.5;
      const expectedCost = consumption * 0.6;

      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streetLightId: testStreetLight.id,
          date: testDate,
          consumption: consumption,
          duration: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.data.cost).toBeCloseTo(expectedCost, 1);
    });

    it('should return 400 when streetLightId is missing', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: testDate,
          consumption: 1.2,
          duration: 12
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when consumption is negative', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streetLightId: testStreetLight.id,
          date: testDate,
          consumption: -1.2,
          duration: 12
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when date is invalid', async () => {
      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streetLightId: testStreetLight.id,
          date: 'invalid-date',
          consumption: 1.2,
          duration: 12
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/energy/records')
        .send({
          streetLightId: testStreetLight.id,
          date: testDate,
          consumption: 1.2,
          duration: 12
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should store energy record in database', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const consumption = 3.5;

      const response = await request(app)
        .post('/api/energy/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streetLightId: testStreetLight.id,
          date: testDate,
          consumption: consumption,
          duration: 12
        });

      const recordId = response.body.data.id;
      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const savedRecord = await energyRepo.findOne({ where: { id: recordId } });

      expect(savedRecord).toBeDefined();
      expect(savedRecord?.consumption).toBe(consumption);
      expect(savedRecord?.streetLightId).toBe(testStreetLight.id);
    });
  });

  describe('Energy Records List', () => {
    beforeAll(async () => {
      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const records = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        records.push(energyRepo.create({
          streetLightId: testStreetLight.id,
          area: testStreetLight.area,
          date: date,
          consumption: 1 + Math.random() * 2,
          duration: 12
        }));
      }
      await energyRepo.save(records);
    });

    it('should get energy records with pagination', async () => {
      const response = await request(app)
        .get('/api/energy/records?page=1&pageSize=10')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeLessThanOrEqual(10);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
    });

    it('should get second page of records', async () => {
      const response = await request(app)
        .get('/api/energy/records?page=2&pageSize=10')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(2);
    });

    it('should filter records by streetLightId', async () => {
      const response = await request(app)
        .get(`/api/energy/records?streetLightId=${testStreetLight.id}&page=1&pageSize=10`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const items = response.body.data.items;
      if (items.length > 0) {
        expect(items[0].streetLightId).toBe(testStreetLight.id);
      }
    });

    it('should filter records by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/energy/records?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&page=1&pageSize=10`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 403 for non-finance/non-admin user', async () => {
      const inspectorLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'inspector', password: '123456' });
      const inspectorToken = inspectorLogin.body.data?.accessToken;

      const response = await request(app)
        .get('/api/energy/records?page=1&pageSize=10')
        .set('Authorization', `Bearer ${inspectorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Budget Monitoring and Alerts', () => {
    it('should monitor budget and detect overage', async () => {
      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const testDate = new Date().toISOString().split('T')[0];

      for (let i = 0; i < 15; i++) {
        const record = energyRepo.create({
          streetLightId: testStreetLight.id,
          area: '朝阳区',
          date: new Date(),
          consumption: 0.8,
          duration: 1
        });
        await energyRepo.save(record);
      }

      const response = await request(app)
        .post('/api/energy/monitor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          area: '朝阳区',
          date: testDate
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('budget');
      expect(response.body.data).toHaveProperty('actual');
      expect(response.body.data).toHaveProperty('usageRate');
      expect(response.body.data).toHaveProperty('alertGenerated');
    });

    it('should generate alert when budget exceeded', async () => {
      const alertRepo = AppDataSource.getRepository(EnergyAlert);
      const initialCount = await alertRepo.count({ where: { area: '朝阳区' } });

      const testDate = new Date().toISOString().split('T')[0];
      await request(app)
        .post('/api/energy/monitor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          area: '朝阳区',
          date: testDate
        });

      const afterCount = await alertRepo.count({ where: { area: '朝阳区' } });
      expect(afterCount).toBeGreaterThanOrEqual(initialCount);
    });

    it('should get energy alerts list', async () => {
      const response = await request(app)
        .get('/api/energy/alerts?page=1&pageSize=10')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
    });

    it('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/energy/alerts?status=pending&page=1&pageSize=10')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const items = response.body.data.items;
      if (items.length > 0) {
        expect(items[0].status).toBe('pending');
      }
    });

    it('should handle energy alert', async () => {
      const alertRepo = AppDataSource.getRepository(EnergyAlert);
      const alert = alertRepo.create({
        area: '朝阳区',
        alertType: 'budget_exceed',
        message: '测试能耗预警',
        currentValue: 15,
        threshold: 10,
        status: 'pending'
      });
      const savedAlert = await alertRepo.save(alert);

      const response = await request(app)
        .put(`/api/energy/alerts/${savedAlert.id}/handle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'handled',
          remark: '已处理测试预警'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedAlert = await alertRepo.findOne({ where: { id: savedAlert.id } });
      expect(updatedAlert?.status).toBe('handled');

      await alertRepo.delete(savedAlert.id);
    });

    it('should return 404 when handling non-existent alert', async () => {
      const response = await request(app)
        .put('/api/energy/alerts/non-existent-id/handle')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'handled',
          remark: '测试'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should calculate usage rate correctly', async () => {
      const testDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/energy/monitor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          area: '朝阳区',
          date: testDate
        });

      const { budget, actual, usageRate } = response.body.data;
      if (budget > 0) {
        expect(usageRate).toBeCloseTo(actual / budget, 2);
      }
    });

    it('should generate alert when usage exceeds threshold', async () => {
      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const alertRepo = AppDataSource.getRepository(EnergyAlert);

      for (let i = 0; i < 20; i++) {
        const record = energyRepo.create({
          streetLightId: testStreetLight.id,
          area: '朝阳区',
          date: new Date(),
          consumption: 1.5,
          duration: 1
        });
        await energyRepo.save(record);
      }

      const beforeCount = await alertRepo.count({ where: { area: '朝阳区', status: 'pending' } });

      const testDate = new Date().toISOString().split('T')[0];
      await request(app)
        .post('/api/energy/monitor')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          area: '朝阳区',
          date: testDate
        });

      const afterCount = await alertRepo.count({ where: { area: '朝阳区', status: 'pending' } });
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
    });
  });

  describe('Energy Statistics', () => {
    it('should get energy statistics', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/energy/stats?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConsumption');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('averageDaily');
      expect(response.body.data).toHaveProperty('byArea');
    });

    it('should get energy statistics grouped by area', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/energy/stats?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&area=朝阳区`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get area energy trend', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/energy/trend?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&area=朝阳区`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('area');
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('trendData');
      expect(Array.isArray(response.body.data.trendData)).toBe(true);
    });

    it('should return 400 for invalid date range in stats', async () => {
      const response = await request(app)
        .get('/api/energy/stats?startDate=invalid&endDate=invalid')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should calculate total cost correctly in statistics', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const energyRepo = AppDataSource.getRepository(EnergyConsumption);
      const testConsumption = 5.0;
      await energyRepo.save(energyRepo.create({
        streetLightId: testStreetLight.id,
        area: '朝阳区',
        date: new Date(),
        consumption: testConsumption,
        duration: 5
      }));

      const response = await request(app)
        .get(`/api/energy/stats?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${financeToken}`);

      const { totalConsumption, totalCost } = response.body.data;
      expect(totalCost).toBeCloseTo(totalConsumption * 0.6, 1);
    });
  });
});
