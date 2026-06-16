import { Router } from 'express';
import { WorkOrderController } from '../controllers/workorder.controller';

const router = Router();

router.get('/', WorkOrderController.getWorkOrderList);
router.get('/:id', WorkOrderController.getWorkOrderDetail);
router.post('/:id/assign', WorkOrderController.assignWorkOrder);
router.post('/:id/accept', WorkOrderController.acceptWorkOrder);
router.post('/:id/start', WorkOrderController.startWorkOrder);
router.post('/:id/complete', WorkOrderController.completeWorkOrder);
router.post('/:id/verify', WorkOrderController.verifyWorkOrder);
router.get('/:id/voucher', WorkOrderController.downloadVoucher);

export default router;
