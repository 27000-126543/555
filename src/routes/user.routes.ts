import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  roleMiddleware([UserRole.ADMIN]),
  UserController.createUser
);

router.get(
  '/',
  roleMiddleware([UserRole.ADMIN]),
  UserController.getUserList
);

router.get(
  '/:id',
  roleMiddleware([UserRole.ADMIN]),
  UserController.getUserDetail
);

router.put(
  '/:id',
  roleMiddleware([UserRole.ADMIN]),
  UserController.updateUser
);

router.delete(
  '/:id',
  roleMiddleware([UserRole.ADMIN]),
  UserController.deleteUser
);

router.put(
  '/:id/status',
  roleMiddleware([UserRole.ADMIN]),
  UserController.updateUserStatus
);

router.put(
  '/:id/reset-password',
  roleMiddleware([UserRole.ADMIN]),
  UserController.resetPassword
);

export default router;
