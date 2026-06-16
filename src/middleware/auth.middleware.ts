import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { error, HttpStatus } from '../utils/response';
import { User, UserRole } from '../entities/User';
import { AppDataSource } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

const userRepository = AppDataSource.getRepository(User);

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error('未提供认证令牌', HttpStatus.UNAUTHORIZED));
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error('用户不存在', HttpStatus.UNAUTHORIZED));
    }

    if (!user.status) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error('账号已被禁用', HttpStatus.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error('认证令牌已过期', HttpStatus.UNAUTHORIZED));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error('无效的认证令牌', HttpStatus.UNAUTHORIZED));
    }
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .json(error('认证失败', HttpStatus.UNAUTHORIZED));
  }
};

export default authMiddleware;
