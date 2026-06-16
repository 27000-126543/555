import { Router } from 'express';
import Joi from 'joi';
import { StreetLightController } from '../controllers/streetlight.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { UserRole } from '../entities/User';
import { StreetLightStatus } from '../entities/StreetLight';

const router = Router();

const createStreetLightSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '路灯编码不能为空',
    'any.required': '路灯编码是必填项',
  }),
  area: Joi.string().required().messages({
    'string.empty': '所属区域不能为空',
    'any.required': '所属区域是必填项',
  }),
  address: Joi.string().required().messages({
    'string.empty': '地址不能为空',
    'any.required': '地址是必填项',
  }),
  lng: Joi.number().optional().messages({
    'number.base': '经度必须是数字',
  }),
  lat: Joi.number().optional().messages({
    'number.base': '纬度必须是数字',
  }),
  model: Joi.string().optional(),
  installDate: Joi.date().optional().messages({
    'date.base': '安装日期格式不正确',
  }),
  status: Joi.string()
    .valid(...Object.values(StreetLightStatus))
    .optional()
    .messages({
      'any.only': '状态值无效',
    }),
  brightness: Joi.number().integer().min(0).max(100).optional().messages({
    'number.base': '亮度必须是数字',
    'number.integer': '亮度必须是整数',
    'number.min': '亮度不能小于0',
    'number.max': '亮度不能大于100',
  }),
  power: Joi.number().min(0).optional().messages({
    'number.base': '功率必须是数字',
    'number.min': '功率不能小于0',
  }),
});

const updateStreetLightSchema = Joi.object({
  area: Joi.string().optional(),
  address: Joi.string().optional(),
  lng: Joi.number().optional().messages({
    'number.base': '经度必须是数字',
  }),
  lat: Joi.number().optional().messages({
    'number.base': '纬度必须是数字',
  }),
  model: Joi.string().optional(),
  installDate: Joi.date().optional().messages({
    'date.base': '安装日期格式不正确',
  }),
  brightness: Joi.number().integer().min(0).max(100).optional().messages({
    'number.base': '亮度必须是数字',
    'number.integer': '亮度必须是整数',
    'number.min': '亮度不能小于0',
    'number.max': '亮度不能大于100',
  }),
  power: Joi.number().min(0).optional().messages({
    'number.base': '功率必须是数字',
    'number.min': '功率不能小于0',
  }),
});

router.post(
  '/',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(createStreetLightSchema, 'body'),
  auditMiddleware('创建路灯'),
  StreetLightController.createStreetLight
);

router.get(
  '/',
  authMiddleware,
  StreetLightController.getStreetLightList
);

router.get(
  '/stats',
  authMiddleware,
  StreetLightController.getLightStats
);

router.get(
  '/code/:code',
  authMiddleware,
  StreetLightController.getLightByCode
);

router.get(
  '/:id',
  authMiddleware,
  StreetLightController.getStreetLightDetail
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(updateStreetLightSchema, 'body'),
  auditMiddleware('更新路灯'),
  StreetLightController.updateStreetLight
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  auditMiddleware('删除路灯'),
  StreetLightController.deleteStreetLight
);

export default router;
