import { Router } from 'express';
import Joi from 'joi';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { UserRole } from '../entities/User';

const router = Router();

const scanSchema = Joi.object({
  lightCode: Joi.string().required().messages({
    'string.empty': '路灯编码不能为空',
    'any.required': '路灯编码是必填项',
  }),
});

const usePartsSchema = Joi.object({
  parts: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().required().messages({
          'string.empty': '配件ID不能为空',
          'any.required': '配件ID是必填项',
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'number.base': '数量必须是数字',
          'number.integer': '数量必须是整数',
          'number.min': '数量必须大于0',
          'any.required': '数量是必填项',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': '至少需要一个配件',
      'any.required': '配件信息是必填项',
    }),
});

const completeSchema = Joi.object({
  description: Joi.string().required().messages({
    'string.empty': '维修描述不能为空',
    'any.required': '维修描述是必填项',
  }),
  photos: Joi.alternatives()
    .try(Joi.array().items(Joi.string()).min(1), Joi.string())
    .required()
    .messages({
      'any.required': '现场照片是必填项',
    }),
  report: Joi.string().required().messages({
    'string.empty': '维修报告不能为空',
    'any.required': '维修报告是必填项',
  }),
  laborCost: Joi.number().min(0).optional().messages({
    'number.base': '人工成本必须是数字',
    'number.min': '人工成本不能小于0',
  }),
});

router.post(
  '/:orderId/scan',
  authMiddleware,
  roleMiddleware([UserRole.MAINTAINER]),
  validationMiddleware(scanSchema, 'body'),
  auditMiddleware('扫码开始维修'),
  MaintenanceController.scanQRCodeAndStart
);

router.post(
  '/:orderId/parts',
  authMiddleware,
  roleMiddleware([UserRole.MAINTAINER]),
  validationMiddleware(usePartsSchema, 'body'),
  auditMiddleware('使用维修配件'),
  MaintenanceController.useParts
);

router.post(
  '/:orderId/complete',
  authMiddleware,
  roleMiddleware([UserRole.MAINTAINER]),
  validationMiddleware(completeSchema, 'body'),
  auditMiddleware('完成维修'),
  MaintenanceController.completeMaintenance
);

router.get(
  '/',
  authMiddleware,
  MaintenanceController.getMaintenanceList
);

router.get(
  '/:id',
  authMiddleware,
  MaintenanceController.getMaintenanceDetail
);

router.get(
  '/order/:orderId',
  authMiddleware,
  MaintenanceController.getMaintenanceByWorkOrder
);

export default router;
