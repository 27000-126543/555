import { Router } from 'express';
import Joi from 'joi';
import { PartController } from '../controllers/part.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { UserRole } from '../entities/User';

const router = Router();

const createPartSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '配件编码不能为空',
    'any.required': '配件编码是必填项',
  }),
  name: Joi.string().required().messages({
    'string.empty': '配件名称不能为空',
    'any.required': '配件名称是必填项',
  }),
  category: Joi.string().optional(),
  unit: Joi.string().optional(),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.base': '库存必须是数字',
    'number.integer': '库存必须是整数',
    'number.min': '库存不能小于0',
  }),
  minStock: Joi.number().integer().min(0).optional().messages({
    'number.base': '最低库存必须是数字',
    'number.integer': '最低库存必须是整数',
    'number.min': '最低库存不能小于0',
  }),
  price: Joi.number().min(0).optional().messages({
    'number.base': '价格必须是数字',
    'number.min': '价格不能小于0',
  }),
  supplier: Joi.string().optional(),
});

const updatePartSchema = Joi.object({
  name: Joi.string().optional(),
  category: Joi.string().optional(),
  unit: Joi.string().optional(),
  minStock: Joi.number().integer().min(0).optional().messages({
    'number.base': '最低库存必须是数字',
    'number.integer': '最低库存必须是整数',
    'number.min': '最低库存不能小于0',
  }),
  price: Joi.number().min(0).optional().messages({
    'number.base': '价格必须是数字',
    'number.min': '价格不能小于0',
  }),
  supplier: Joi.string().optional(),
});

const addStockSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': '数量必须是数字',
    'number.integer': '数量必须是整数',
    'number.min': '数量必须大于0',
    'any.required': '数量是必填项',
  }),
  remark: Joi.string().optional(),
});

router.post(
  '/',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(createPartSchema, 'body'),
  auditMiddleware('创建配件'),
  PartController.createPart
);

router.get(
  '/',
  authMiddleware,
  PartController.getPartList
);

router.get(
  '/low-stock',
  authMiddleware,
  PartController.getLowStockParts
);

router.get(
  '/:id',
  authMiddleware,
  PartController.getPartDetail
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(updatePartSchema, 'body'),
  auditMiddleware('更新配件'),
  PartController.updatePart
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  auditMiddleware('删除配件'),
  PartController.deletePart
);

router.post(
  '/:id/stock/add',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(addStockSchema, 'body'),
  auditMiddleware('增加配件库存'),
  PartController.addStock
);

export default router;
