import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authMiddleware);

router.post(
  '/reports/generate',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.generateReport
);

router.get(
  '/reports',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.getReportList
);

router.get(
  '/reports/:id',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.getReportDetail
);

router.get(
  '/reports/month/:month',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.getReportByMonth
);

router.get(
  '/performance/compare',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.comparePerformance
);

router.get(
  '/reports/:id/voucher',
  roleMiddleware([UserRole.ADMIN, UserRole.FINANCE]),
  FinanceController.downloadVoucher
);

export default router;
