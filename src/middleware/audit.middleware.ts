import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';

const auditLogRepository = AppDataSource.getRepository(AuditLog);

export const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      const params = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      if (userId) {
        const auditLog = auditLogRepository.create({
          userId,
          action,
          ip,
          userAgent,
          params,
        });

        await auditLogRepository.save(auditLog);
      }

      next();
    } catch (err) {
      console.error('审计日志记录失败:', err);
      next();
    }
  };
};

export default auditMiddleware;
