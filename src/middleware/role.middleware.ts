import { Request, Response, NextFunction } from 'express';
import { error, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';

export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json(error('请先登录', HttpStatus.UNAUTHORIZED));
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json(error('权限不足，无法执行此操作', HttpStatus.FORBIDDEN));
      }

      next();
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(error('权限验证失败', HttpStatus.INTERNAL_SERVER_ERROR));
    }
  };
};

export default roleMiddleware;
