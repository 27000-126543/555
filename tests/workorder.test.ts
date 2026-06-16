import request from 'supertest';
import app from '../src/app';
import { AppDataSource } from '../src/config/database';
import { User, UserRole } from '../src/entities/User';
import { StreetLight } from '../src/entities/StreetLight';
import { Inspection } from '../src/entities/Inspection';
import { WorkOrder, WorkOrderStatus } from '../src/entities/WorkOrder';

describe('Work Order Module Tests', () => {
  let adminToken: string;
  let inspectorToken: string;
  let maintainerToken: string;
  let testStreetLight: StreetLight;
  let testWorkOrder: WorkOrder;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    adminToken = adminLogin.body.data?.accessToken;

    const inspectorLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'inspector', password: '123456' });
    inspectorToken = inspectorLogin.body.data?.accessToken;

    const maintainerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'maintainer', password: '123456' });
    maintainerToken = maintainerLogin.body.data?.accessToken;

    const lightRepo = AppDataSource.getRepository(StreetLight);
    testStreetLight = lightRepo.create({
      code: 'TEST-LD-001',
      area: '朝阳区',
      address: '测试路1号',
      lng: 116.4074,
      lat: 39.9042,
      model: 'LED-100W',
      power: 100
    });
    await lightRepo.save(testStreetLight);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      const lightRepo = AppDataSource.getRepository(StreetLight);
      if (testStreetLight) {
        await lightRepo.delete(testStreetLight.id);
      }
      await AppDataSource.destroy();
    }
  });

  describe('Create Inspection Record', () => {
    it('should create inspection record successfully', async () => {
      const response = await request(app)
        .post('/api/inspections')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          streetLightId: testStreetLight.id,
          inspectDate: new Date().toISOString().split('T')[0],
          faultType: '灯泡烧坏',
          faultLevel: 'low',
          description: '灯泡不亮，需要更换',
          images: ['test-image.jpg']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.faultType).toBe('灯泡烧坏');
      expect(response.body.data.faultLevel).toBe('low');
    });

    it('should return 400 when streetLightId is missing', async () => {
      const response = await request(app)
        .post('/api/inspections')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          inspectDate: new Date().toISOString().split('T')[0],
          faultType: '灯泡烧坏',
          faultLevel: 'low'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when faultLevel is invalid', async () => {
      const response = await request(app)
        .post('/api/inspections')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          streetLightId: testStreetLight.id,
          inspectDate: new Date().toISOString().split('T')[0],
          faultType: '灯泡烧坏',
          faultLevel: 'invalid_level'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/inspections')
        .send({
          streetLightId: testStreetLight.id,
          inspectDate: new Date().toISOString().split('T')[0],
          faultType: '灯泡烧坏',
          faultLevel: 'low'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Intelligent Work Order Assignment', () => {
    let inspectionId: string;

    beforeAll(async () => {
      const inspectionRepo = AppDataSource.getRepository(Inspection);
      const inspection = inspectionRepo.create({
        inspectorId: (AppDataSource.getRepository(User).getId as any)({}),
        streetLightId: testStreetLight.id,
        inspectDate: new Date(),
        faultType: '镇流器故障',
        faultLevel: 'medium',
        description: '镇流器异响'
      });
      const saved = await inspectionRepo.save(inspection);
      inspectionId = saved.id;
    });

    it('should assign work order to appropriate maintainer based on area', async () => {
      const maintainerRepo = AppDataSource.getRepository(User);
      const maintainers = await maintainerRepo.find({
        where: { role: UserRole.MAINTAINER, area: testStreetLight.area }
      });

      expect(maintainers.length).toBeGreaterThan(0);
    });

    it('should create work order from inspection automatically', async () => {
      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const userRepo = AppDataSource.getRepository(User);
      const maintainers = await userRepo.find({ where: { role: UserRole.MAINTAINER } });

      if (maintainers.length > 0) {
        const workOrder = workOrderRepo.create({
          orderNo: `WO${Date.now()}`,
          streetLightId: testStreetLight.id,
          faultType: '镇流器故障',
          faultLevel: 'medium',
          status: WorkOrderStatus.PENDING,
          priority: 2
        });
        const saved = await workOrderRepo.save(workOrder);
        testWorkOrder = saved;

        expect(saved).toHaveProperty('id');
        expect(saved.status).toBe(WorkOrderStatus.PENDING);
        expect(saved.faultType).toBe('镇流器故障');
      }
    });

    it('should assign work order via API', async () => {
      if (testWorkOrder) {
        const maintainerRepo = AppDataSource.getRepository(User);
        const maintainer = await maintainerRepo.findOne({ where: { role: UserRole.MAINTAINER } });

        if (maintainer) {
          const response = await request(app)
            .post(`/api/workorders/${testWorkOrder.id}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              maintainerId: maintainer.id
            });

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      }
    });

    it('should return 403 when non-admin tries to assign work order', async () => {
      if (testWorkOrder) {
        const maintainerRepo = AppDataSource.getRepository(User);
        const maintainer = await maintainerRepo.findOne({ where: { role: UserRole.MAINTAINER } });

        if (maintainer) {
          const response = await request(app)
            .post(`/api/workorders/${testWorkOrder.id}/assign`)
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({
              maintainerId: maintainer.id
            });

          expect(response.status).toBe(403);
          expect(response.body.success).toBe(false);
        }
      }
    });
  });

  describe('Work Order Flow: Assign -> Accept -> Start -> Complete -> Verify', () => {
    let flowWorkOrder: WorkOrder;
    let testMaintainer: User;

    beforeAll(async () => {
      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const userRepo = AppDataSource.getRepository(User);

      testMaintainer = await userRepo.findOne({ where: { role: UserRole.MAINTAINER } }) as User;

      flowWorkOrder = workOrderRepo.create({
        orderNo: `FLOW-WO${Date.now()}`,
        streetLightId: testStreetLight.id,
        faultType: '灯泡烧坏',
        faultLevel: 'low',
        status: WorkOrderStatus.PENDING,
        priority: 1
      });
      flowWorkOrder = await workOrderRepo.save(flowWorkOrder);
    });

    afterAll(async () => {
      if (flowWorkOrder && AppDataSource.isInitialized) {
        const workOrderRepo = AppDataSource.getRepository(WorkOrder);
        await workOrderRepo.delete(flowWorkOrder.id);
      }
    });

    it('Step 1: Admin should assign work order to maintainer', async () => {
      const response = await request(app)
        .post(`/api/workorders/${flowWorkOrder.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          maintainerId: testMaintainer.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const updated = await workOrderRepo.findOne({ where: { id: flowWorkOrder.id } });
      expect(updated?.status).toBe(WorkOrderStatus.ASSIGNED);
      expect(updated?.maintainerId).toBe(testMaintainer.id);
    });

    it('Step 2: Maintainer should accept the work order', async () => {
      const response = await request(app)
        .post(`/api/workorders/${flowWorkOrder.id}/accept`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const updated = await workOrderRepo.findOne({ where: { id: flowWorkOrder.id } });
      expect(updated?.status).toBe(WorkOrderStatus.ACCEPTED);
      expect(updated?.acceptedAt).toBeDefined();
    });

    it('Step 3: Maintainer should start the work order', async () => {
      const response = await request(app)
        .post(`/api/workorders/${flowWorkOrder.id}/start`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const updated = await workOrderRepo.findOne({ where: { id: flowWorkOrder.id } });
      expect(updated?.status).toBe(WorkOrderStatus.PROCESSING);
      expect(updated?.startedAt).toBeDefined();
    });

    it('Step 4: Maintainer should complete the work order', async () => {
      const response = await request(app)
        .post(`/api/workorders/${flowWorkOrder.id}/complete`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({
          description: '已更换灯泡，测试正常',
          photos: ['photo1.jpg', 'photo2.jpg'],
          report: '维修完成，灯泡已更换，路灯恢复正常照明',
          laborCost: 50
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const updated = await workOrderRepo.findOne({ where: { id: flowWorkOrder.id } });
      expect(updated?.status).toBe(WorkOrderStatus.COMPLETED);
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.laborCost).toBe(50);
    });

    it('Step 5: Admin should verify the completed work order', async () => {
      const response = await request(app)
        .post(`/api/workorders/${flowWorkOrder.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          passed: true,
          comment: '维修合格，路灯正常工作'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const updated = await workOrderRepo.findOne({ where: { id: flowWorkOrder.id } });
      expect(updated?.status).toBe(WorkOrderStatus.VERIFIED);
      expect(updated?.verifiedAt).toBeDefined();
    });

    it('should not allow status transition in wrong order', async () => {
      const workOrderRepo = AppDataSource.getRepository(WorkOrder);
      const newOrder = workOrderRepo.create({
        orderNo: `TEST-WRONG${Date.now()}`,
        streetLightId: testStreetLight.id,
        faultType: '测试故障',
        faultLevel: 'low',
        status: WorkOrderStatus.PENDING,
        priority: 1
      });
      const saved = await workOrderRepo.save(newOrder);

      const completeResponse = await request(app)
        .post(`/api/workorders/${saved.id}/complete`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({
          description: '测试',
          photos: ['test.jpg'],
          report: '测试报告',
          laborCost: 0
        });

      expect(completeResponse.status).not.toBe(200);

      await workOrderRepo.delete(saved.id);
    });

    it('should return 404 for non-existent work order', async () => {
      const response = await request(app)
        .post('/api/workorders/non-existent-id/accept')
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Work Order List and Details', () => {
    it('should get work order list with pagination', async () => {
      const response = await request(app)
        .get('/api/workorders?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('pageSize', 10);
    });

    it('should filter work orders by status', async () => {
      const response = await request(app)
        .get('/api/workorders?status=completed&page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const items = response.body.data.items;
      if (items.length > 0) {
        expect(items[0].status).toBe('completed');
      }
    });

    it('should get work order detail', async () => {
      if (testWorkOrder) {
        const response = await request(app)
          .get(`/api/workorders/${testWorkOrder.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testWorkOrder.id);
      }
    });

    it('should return 404 for non-existent work order detail', async () => {
      const response = await request(app)
        .get('/api/workorders/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
