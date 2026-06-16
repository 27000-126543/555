import { Router } from 'express';
import { InspectionController } from '../controllers/inspection.controller';

const router = Router();

router.post('/', InspectionController.createInspection);
router.get('/', InspectionController.getInspectionList);
router.get('/:id', InspectionController.getInspectionDetail);
router.put('/:id', InspectionController.updateInspection);
router.delete('/:id', InspectionController.deleteInspection);

export default router;
