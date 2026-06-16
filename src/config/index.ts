import * as dotenv from 'dotenv';
import { Role } from '../types';

dotenv.config();

export const appConfig = {
  port: parseInt(process.env.APP_PORT || '3000', 10),
  host: process.env.APP_HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'streetlight-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  algorithm: (process.env.JWT_ALGORITHM as 'HS256' | 'HS512') || 'HS256',
};

export const energyConfig = {
  dailyThreshold: parseFloat(process.env.ENERGY_DAILY_THRESHOLD || '1000'),
  monthlyThreshold: parseFloat(process.env.ENERGY_MONTHLY_THRESHOLD || '30000'),
  alertCooldownMinutes: parseInt(process.env.ENERGY_ALERT_COOLDOWN || '30', 10),
  efficiencyWarningThreshold: parseFloat(process.env.ENERGY_EFFICIENCY_WARNING || '0.8'),
  efficiencyCriticalThreshold: parseFloat(process.env.ENERGY_EFFICIENCY_CRITICAL || '0.5'),
  budgetDeviationThreshold: parseFloat(process.env.BUDGET_DEVIATION_THRESHOLD || '10'),
};

export const rolePermissions: Record<Role, string[]> = {
  inspector: [
    'inspection:create',
    'inspection:read',
    'inspection:update',
    'light:read',
    'fault:report',
    'notification:read',
  ],
  maintainer: [
    'work_order:read',
    'work_order:accept',
    'work_order:update',
    'work_order:complete',
    'light:read',
    'light:update_status',
    'maintenance:create',
    'maintenance:update',
    'notification:read',
  ],
  finance: [
    'energy:read',
    'energy:export',
    'bill:read',
    'bill:create',
    'bill:update',
    'report:generate',
    'report:export',
  ],
  admin: [
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'role:manage',
    'inspection:*',
    'work_order:*',
    'light:*',
    'fault:*',
    'energy:*',
    'maintenance:*',
    'report:*',
    'notification:*',
    'system:configure',
  ],
};

export const paginationConfig = {
  defaultPage: 1,
  defaultPageSize: 10,
  maxPageSize: 100,
};

export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

export default {
  app: appConfig,
  jwt: jwtConfig,
  energy: energyConfig,
  rolePermissions,
  pagination: paginationConfig,
  upload: uploadConfig,
};
