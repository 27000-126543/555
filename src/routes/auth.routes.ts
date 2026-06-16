import { Router } from 'express';
import Joi from 'joi';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { UserRole } from '../entities/User';

const router = Router();

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': '用户名不能为空',
    'any.required': '用户名是必填项',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': '密码不能为空',
    'string.min': '密码长度不能少于6位',
    'any.required': '密码是必填项',
  }),
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.empty': '用户名不能为空',
    'string.min': '用户名长度不能少于3位',
    'string.max': '用户名长度不能超过50位',
    'any.required': '用户名是必填项',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': '密码不能为空',
    'string.min': '密码长度不能少于6位',
    'any.required': '密码是必填项',
  }),
  realName: Joi.string().required().messages({
    'string.empty': '真实姓名不能为空',
    'any.required': '真实姓名是必填项',
  }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required()
    .messages({
      'any.only': '角色值无效',
      'any.required': '角色是必填项',
    }),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional().messages({
    'string.email': '邮箱格式不正确',
  }),
  area: Joi.string().optional(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'string.empty': '原密码不能为空',
    'any.required': '原密码是必填项',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.empty': '新密码不能为空',
    'string.min': '新密码长度不能少于6位',
    'any.required': '新密码是必填项',
  }),
});

router.post(
  '/login',
  validationMiddleware(loginSchema, 'body'),
  auditMiddleware('用户登录'),
  AuthController.login
);

router.post(
  '/register',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  validationMiddleware(registerSchema, 'body'),
  auditMiddleware('用户注册'),
  AuthController.register
);

router.post(
  '/change-password',
  authMiddleware,
  validationMiddleware(changePasswordSchema, 'body'),
  auditMiddleware('修改密码'),
  AuthController.changePassword
);

router.get(
  '/me',
  authMiddleware,
  AuthController.getCurrentUser
);

export default router;
