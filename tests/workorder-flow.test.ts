import { AppDataSource } from '../src/config/database';
import { User, UserRole } from '../src/entities/User';
import { StreetLight, StreetLightStatus } from '../src/entities/StreetLight';
import { WorkOrder, WorkOrderStatus } from '../src/entities/WorkOrder';
import { Inspection, FaultLevel } from '../src/entities/Inspection';
import { WorkOrderService } from '../src/services/workorder.service';
import { MaintenanceService } from '../src/services/maintenance.service';

const workOrderRepository = AppDataSource.getRepository(WorkOrder);
const streetLightRepository = AppDataSource.getRepository(StreetLight);
const userRepository = AppDataSource.getRepository(User);
const inspectionRepository = AppDataSource.getRepository(Inspection);

async function createTestLight(code: string): Promise<StreetLight> {
  const light = streetLightRepository.create({
    code,
    area: '验收测试区',
    address: `测试路-${code}`,
    lng: 116.4,
    lat: 39.9,
    model: 'LED-100W',
    power: 100,
    status: StreetLightStatus.FAULT,
  });
  return streetLightRepository.save(light);
}

async function createTestMaintainer(suffix: string, area: string): Promise<User> {
  const user = userRepository.create({
    username: `test_maintainer_${suffix}`,
    password: 'hashed',
    realName: `测试维修员${suffix}`,
    role: UserRole.MAINTAINER,
    phone: '13800000000',
    area,
    status: true,
  });
  return userRepository.save(user);
}

async function createTestAdmin(): Promise<User> {
  const user = userRepository.create({
    username: `test_admin_flow_${Date.now()}`,
    password: 'hashed',
    realName: '测试管理员',
    role: UserRole.ADMIN,
    phone: '13900000000',
    status: true,
  });
  return userRepository.save(user);
}

async function createTestInspection(lightId: string, faultLevel: FaultLevel, faultType: string): Promise<Inspection> {
  const inspection = inspectionRepository.create({
    inspectorId: 'test-inspector-id',
    streetLightId: lightId,
    inspectDate: new Date(),
    faultType,
    faultLevel,
    description: '验收测试巡检',
  });
  return inspectionRepository.save(inspection);
}

async function createTestWorkOrder(lightId: string, maintainerId: string): Promise<WorkOrder> {
  const order = workOrderRepository.create({
    orderNo: `FLOW-TEST-${Date.now()}`,
    streetLightId: lightId,
    faultType: '灯泡烧坏',
    faultLevel: FaultLevel.LOW,
    status: WorkOrderStatus.ASSIGNED,
    priority: 1,
    maintainerId,
    assignedAt: new Date(),
  });
  return workOrderRepository.save(order);
}

describe('工单流程验收测试', () => {
  let testLight: StreetLight;
  let testMaintainer: User;
  let testAdmin: User;
  let otherMaintainer: User;
  let createdIds: string[] = [];

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    testLight = await createTestLight(`FLOW-${Date.now()}`);
    testMaintainer = await createTestMaintainer('A', '验收测试区');
    otherMaintainer = await createTestMaintainer('B', '其他区域');
    testAdmin = await createTestAdmin();
    createdIds.push(testLight.id, testMaintainer.id, otherMaintainer.id, testAdmin.id);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      for (const id of createdIds) {
        try { await workOrderRepository.delete(id); } catch {}
        try { await streetLightRepository.delete(id); } catch {}
        try { await userRepository.delete(id); } catch {}
        try { await inspectionRepository.delete(id); } catch {}
      }
      await AppDataSource.destroy();
    }
  });

  describe('场景1: 开工时路灯应变为维修中', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const light = await createTestLight(`START-${Date.now()}`);
      createdIds.push(light.id);
      workOrder = await createTestWorkOrder(light.id, testMaintainer.id);
      createdIds.push(workOrder.id);
    });

    it('通过 /api/workorders/:id/start 开工后，路灯状态应为 maintaining', async () => {
      const lightBefore = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightBefore!.status).toBe(StreetLightStatus.FAULT);

      const updated = await WorkOrderService.startWorkOrder(
        workOrder.id,
        testMaintainer.id,
        lightBefore!.code
      );

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(WorkOrderStatus.PROCESSING);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.MAINTAINING);
    });

    it('通过 /api/maintenance/:orderId/scan 开工后，路灯状态也应是 maintaining', async () => {
      const lightBefore = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightBefore!.status).toBe(StreetLightStatus.FAULT);

      const updated = await MaintenanceService.scanQRCodeAndStart(
        workOrder.id,
        testMaintainer.id,
        lightBefore!.code
      );

      expect(updated.status).toBe(WorkOrderStatus.PROCESSING);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.MAINTAINING);
    });
  });

  describe('场景2: 完工后路灯保持维修中，待审核', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const light = await createTestLight(`COMPLETE-${Date.now()}`);
      createdIds.push(light.id);
      workOrder = await createTestWorkOrder(light.id, testMaintainer.id);
      createdIds.push(workOrder.id);

      const lightEntity = await streetLightRepository.findOneBy({ id: light.id });
      await WorkOrderService.startWorkOrder(workOrder.id, testMaintainer.id, lightEntity!.code);

      workOrder = (await workOrderRepository.findOneBy({ id: workOrder.id }))!;
    });

    it('通过 /api/workorders/:id/complete 完工后，工单为 completed，路灯仍为 maintaining', async () => {
      const updated = await WorkOrderService.completeWorkOrder(workOrder.id, testMaintainer.id, {
        description: '已修复',
        photos: ['after.jpg'],
        report: '维修报告',
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(WorkOrderStatus.COMPLETED);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.MAINTAINING);
    });

    it('通过 /api/maintenance/:orderId/complete 完工后，路灯也仍为 maintaining', async () => {
      const record = await MaintenanceService.completeMaintenance(workOrder.id, testMaintainer.id, {
        description: '已修复',
        photos: ['after.jpg'],
        report: '维修报告',
        laborCost: 50,
      });

      expect(record).toBeDefined();

      const orderAfter = await workOrderRepository.findOneBy({ id: workOrder.id });
      expect(orderAfter!.status).toBe(WorkOrderStatus.COMPLETED);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.MAINTAINING);
    });
  });

  describe('场景3: 接单人完成成功，非接单人完成失败', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const light = await createTestLight(`PERM-${Date.now()}`);
      createdIds.push(light.id);
      workOrder = await createTestWorkOrder(light.id, testMaintainer.id);
      createdIds.push(workOrder.id);

      const lightEntity = await streetLightRepository.findOneBy({ id: light.id });
      await WorkOrderService.startWorkOrder(workOrder.id, testMaintainer.id, lightEntity!.code);

      workOrder = (await workOrderRepository.findOneBy({ id: workOrder.id }))!;
    });

    it('接单维修员通过 workorders 入口完成 - 应成功', async () => {
      const result = await WorkOrderService.completeWorkOrder(workOrder.id, testMaintainer.id, {
        description: '接单人完工',
        photos: ['photo.jpg'],
        report: '报告',
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(WorkOrderStatus.COMPLETED);
    });

    it('非接单维修员通过 workorders 入口完成 - 应抛出权限不足', async () => {
      await expect(
        WorkOrderService.completeWorkOrder(workOrder.id, otherMaintainer.id, {
          description: '冒充完工',
          photos: ['photo.jpg'],
          report: '报告',
        })
      ).rejects.toThrow('权限不足');
    });

    it('非接单维修员通过 maintenance 入口完成 - 应抛出权限不足', async () => {
      await expect(
        MaintenanceService.completeMaintenance(workOrder.id, otherMaintainer.id, {
          description: '冒充完工',
          photos: ['photo.jpg'],
          report: '报告',
          laborCost: 0,
        })
      ).rejects.toThrow('权限不足');
    });
  });

  describe('场景4: 审核通过路灯变正常', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const light = await createTestLight(`VERIFY-PASS-${Date.now()}`);
      createdIds.push(light.id);
      workOrder = await createTestWorkOrder(light.id, testMaintainer.id);
      createdIds.push(workOrder.id);

      const lightEntity = await streetLightRepository.findOneBy({ id: light.id });
      await WorkOrderService.startWorkOrder(workOrder.id, testMaintainer.id, lightEntity!.code);
      await WorkOrderService.completeWorkOrder(workOrder.id, testMaintainer.id, {
        description: '完工',
        photos: ['photo.jpg'],
        report: '报告',
      });

      workOrder = (await workOrderRepository.findOneBy({ id: workOrder.id }))!;
    });

    it('管理员审核通过后，工单变 verified，路灯变 normal', async () => {
      const result = await WorkOrderService.verifyWorkOrder(
        workOrder.id, testAdmin.id, true, '审核通过'
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(WorkOrderStatus.VERIFIED);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.NORMAL);
    });
  });

  describe('场景5: 审核驳回路灯保持维修中', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const light = await createTestLight(`VERIFY-REJECT-${Date.now()}`);
      createdIds.push(light.id);
      workOrder = await createTestWorkOrder(light.id, testMaintainer.id);
      createdIds.push(workOrder.id);

      const lightEntity = await streetLightRepository.findOneBy({ id: light.id });
      await WorkOrderService.startWorkOrder(workOrder.id, testMaintainer.id, lightEntity!.code);
      await WorkOrderService.completeWorkOrder(workOrder.id, testMaintainer.id, {
        description: '完工',
        photos: ['photo.jpg'],
        report: '报告',
      });

      workOrder = (await workOrderRepository.findOneBy({ id: workOrder.id }))!;
    });

    it('管理员审核驳回后，工单回到 processing，路灯保持 maintaining', async () => {
      const lightBefore = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightBefore!.status).toBe(StreetLightStatus.MAINTAINING);

      const result = await WorkOrderService.verifyWorkOrder(
        workOrder.id, testAdmin.id, false, '维修不达标，请重新处理'
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(WorkOrderStatus.PROCESSING);

      const lightAfter = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfter!.status).toBe(StreetLightStatus.MAINTAINING);
    });

    it('驳回后维修员可重新提交完工', async () => {
      await WorkOrderService.verifyWorkOrder(
        workOrder.id, testAdmin.id, false, '需要返工'
      );

      const reComplete = await WorkOrderService.completeWorkOrder(workOrder.id, testMaintainer.id, {
        description: '二次修复完成',
        photos: ['photo2.jpg'],
        report: '二次维修报告',
      });

      expect(reComplete).not.toBeNull();
      expect(reComplete!.status).toBe(WorkOrderStatus.COMPLETED);

      const lightAfterReComplete = await streetLightRepository.findOneBy({ id: workOrder.streetLightId });
      expect(lightAfterReComplete!.status).toBe(StreetLightStatus.MAINTAINING);
    });
  });

  describe('场景6: 两个开工入口状态结果一致', () => {
    it('无论从 workorders 还是 maintenance 入口开工，路灯状态都是 maintaining', async () => {
      const light1 = await createTestLight(`ENTRY-A-${Date.now()}`);
      const light2 = await createTestLight(`ENTRY-B-${Date.now()}`);
      createdIds.push(light1.id, light2.id);

      const order1 = await createTestWorkOrder(light1.id, testMaintainer.id);
      const order2 = await createTestWorkOrder(light2.id, testMaintainer.id);
      createdIds.push(order1.id, order2.id);

      await WorkOrderService.startWorkOrder(order1.id, testMaintainer.id, light1.code);
      await MaintenanceService.scanQRCodeAndStart(order2.id, testMaintainer.id, light2.code);

      const light1After = await streetLightRepository.findOneBy({ id: light1.id });
      const light2After = await streetLightRepository.findOneBy({ id: light2.id });

      expect(light1After!.status).toBe(StreetLightStatus.MAINTAINING);
      expect(light2After!.status).toBe(StreetLightStatus.MAINTAINING);

      const order1After = await workOrderRepository.findOneBy({ id: order1.id });
      const order2After = await workOrderRepository.findOneBy({ id: order2.id });

      expect(order1After!.status).toBe(WorkOrderStatus.PROCESSING);
      expect(order2After!.status).toBe(WorkOrderStatus.PROCESSING);
    });
  });
});
