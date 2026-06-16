import { Router } from 'express';
import { EnergyController } from '../controllers/energy.controller';

const router = Router();

router.post('/records', EnergyController.recordEnergyConsumption);
router.get('/records', EnergyController.getEnergyConsumptionList);
router.get('/stats', EnergyController.getEnergyStats);
router.get('/alerts', EnergyController.getEnergyAlerts);
router.put('/alerts/:id/handle', EnergyController.handleEnergyAlert);
router.get('/trend', EnergyController.getAreaEnergyTrend);
router.post('/monitor', EnergyController.triggerBudgetMonitor);

export default router;
