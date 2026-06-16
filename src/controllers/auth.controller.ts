import { Request, Response } from 'express';
import { AuthService, LoginData, RegisterData, ChangePasswordData } from '../services/auth.service';
import { success, error, HttpStatus } from '../utils/response';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body as LoginData;

      const result = await AuthService.login({ username, password });

      return res.json(
        success(result, '登录成功', HttpStatus.OK)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(error(message, HttpStatus.UNAUTHORIZED));
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const userData = req.body as RegisterData;

      const user = await AuthService.register(userData);

      return res.json(
        success(user, '注册成功', HttpStatus.CREATED)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败';
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(error(message, HttpStatus.BAD_REQUEST));
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json(error('请先登录', HttpStatus.UNAUTHORIZED));
      }

      const { oldPassword, newPassword } = req.body as {
        oldPassword: string;
        newPassword: string;
      };

      const data: ChangePasswordData = {
        userId: req.user.id,
        oldPassword,
        newPassword,
      };

      await AuthService.changePassword(data);

      return res.json(
        success(null, '密码修改成功', HttpStatus.OK)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '密码修改失败';
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(error(message, HttpStatus.BAD_REQUEST));
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json(error('请先登录', HttpStatus.UNAUTHORIZED));
      }

      const { password, ...userWithoutPassword } = req.user;

      return res.json(
        success(userWithoutPassword, '获取用户信息成功', HttpStatus.OK)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户信息失败';
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default AuthController;
