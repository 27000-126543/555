import { Router } from 'express';
import { AreaConfigController } from '../controllers/areaconfig.controller';

const router = Router();

router.post('/', AreaConfigController.createAreaConfig);
router.get('/', AreaConfigController.getAreaConfigList);
router.get('/:id', AreaConfigController.getAreaConfigDetail);
router.put('/:id', AreaConfigController.updateAreaConfig);
router.delete('/:id', AreaConfigController.deleteAreaConfig);
router.post('/:id/lock', AreaConfigController.lockAreaConfig);
router.post('/:id/unlock', AreaConfigController.unlockAreaConfig);

export default router;
