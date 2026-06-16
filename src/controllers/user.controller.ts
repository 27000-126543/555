import { Request, Response, NextFunction } from 'express';
import { UserService, CreateUserData, UpdateUserData, UserFilters } from '../services/user.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { UserRole } from '../entities/User';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user || user.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员可以创建用户', HttpStatus.FORBIDDEN));
      }

      const { username, password, realName, role, phone, email, area } = req.body;

      if (!username || !password || !realName || !role) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少必填参数', HttpStatus.BAD_REQUEST));
      }

      const data: CreateUserData = {
        username,
        password,
        realName,
        role: role as UserRole,
        phone,
        email,
        area,
      };

      const newUser = await UserService.createUser(data);

      return res.status(HttpStatus.CREATED).json(success(newUser, '用户创建成功'));
    } catch (err) {
      next(err);
    }
  }

  static async getUserList(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        role,
        area,
        status,
        keyword,
        page = 1,
        pageSize = 10,
      } = req.query;

      const filters: UserFilters = {
        role: role as UserRole,
        area: area as string,
        status: status !== undefined ? status === 'true' : undefined,
        keyword: keyword as string,
      };

      const result = await UserService.getUserList(
        filters,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      return res.json(paginate(result.items, result.total, parseInt(page as string), parseInt(pageSize as string)));
    } catch (err) {
      next(err);
    }
  }

  static async getUserDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await UserService.getUserDetail(id);

      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json(error('用户不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(user));
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员可以更新用户', HttpStatus.FORBIDDEN));
      }

      const { username, realName, role, phone, email, area } = req.body;

      const data: UpdateUserData = {
        username,
        realName,
        role: role as UserRole,
        phone,
        email,
        area,
      };

      const updatedUser = await UserService.updateUser(id, data);

      if (!updatedUser) {
        return res.status(HttpStatus.NOT_FOUND).json(error('用户不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(updatedUser, '用户更新成功'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员可以删除用户', HttpStatus.FORBIDDEN));
      }

      if (currentUser.id === id) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('不能删除自己', HttpStatus.BAD_REQUEST));
      }

      const deleted = await UserService.deleteUser(id);

      if (!deleted) {
        return res.status(HttpStatus.NOT_FOUND).json(error('用户不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '用户删除成功'));
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员可以更新用户状态', HttpStatus.FORBIDDEN));
      }

      if (currentUser.id === id) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('不能禁用自己', HttpStatus.BAD_REQUEST));
      }

      const { status } = req.body;

      if (status === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少状态参数', HttpStatus.BAD_REQUEST));
      }

      const updatedUser = await UserService.updateUserStatus(id, status);

      if (!updatedUser) {
        return res.status(HttpStatus.NOT_FOUND).json(error('用户不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(updatedUser, `用户已${status ? '启用' : '禁用'}`));
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        return res.status(HttpStatus.FORBIDDEN).json(error('权限不足，只有管理员可以重置密码', HttpStatus.FORBIDDEN));
      }

      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('缺少新密码参数', HttpStatus.BAD_REQUEST));
      }

      if (newPassword.length < 6) {
        return res.status(HttpStatus.BAD_REQUEST).json(error('密码长度至少6位', HttpStatus.BAD_REQUEST));
      }

      const successReset = await UserService.resetPassword(id, newPassword);

      if (!successReset) {
        return res.status(HttpStatus.NOT_FOUND).json(error('用户不存在', HttpStatus.NOT_FOUND));
      }

      return res.json(success(null, '密码重置成功'));
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
