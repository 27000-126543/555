import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { FindOptionsWhere, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';

const userRepository = AppDataSource.getRepository(User);

export interface CreateUserData {
  username: string;
  password: string;
  realName: string;
  role: UserRole;
  phone?: string;
  email?: string;
  area?: string;
}

export interface UpdateUserData {
  username?: string;
  realName?: string;
  role?: UserRole;
  phone?: string;
  email?: string;
  area?: string;
}

export interface UserFilters {
  role?: UserRole;
  area?: string;
  status?: boolean;
  keyword?: string;
}

export class UserService {
  static async createUser(data: CreateUserData): Promise<Omit<User, 'password'>> {
    const existingUser = await userRepository.findOne({
      where: { username: data.username },
    });

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = userRepository.create({
      ...data,
      password: hashedPassword,
      status: true,
    });

    const savedUser = await userRepository.save(user);

    const { password, ...userWithoutPassword } = savedUser;

    return userWithoutPassword;
  }

  static async updateUser(
    id: string,
    data: UpdateUserData
  ): Promise<Omit<User, 'password'> | null> {
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return null;
    }

    if (data.username && data.username !== user.username) {
      const existingUser = await userRepository.findOne({
        where: { username: data.username },
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }
    }

    const updatedUser = userRepository.merge(user, data);
    const savedUser = await userRepository.save(updatedUser);

    const { password, ...userWithoutPassword } = savedUser;

    return userWithoutPassword;
  }

  static async deleteUser(id: string): Promise<boolean> {
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return false;
    }

    await userRepository.delete(id);

    return true;
  }

  static async getUserList(
    filters: UserFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: Omit<User, 'password'>[]; total: number }> {
    const where: FindOptionsWhere<User> = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.area) {
      where.area = filters.area;
    }
    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    let query = userRepository.createQueryBuilder('user');

    if (filters.keyword) {
      query = query.where(
        '(user.username ILIKE :keyword OR user.realName ILIKE :keyword OR user.phone ILIKE :keyword OR user.email ILIKE :keyword)',
        { keyword: `%${filters.keyword}%` }
      );
    }

    Object.keys(where).forEach(key => {
      query = query.andWhere(`user.${key} = :${key}`, { [key]: (where as any)[key] });
    });

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const items = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return { items, total };
  }

  static async getUserDetail(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  static async getUsersByRole(role: UserRole): Promise<Omit<User, 'password'>[]> {
    const users = await userRepository.find({
      where: { role, status: true },
      order: { createdAt: 'DESC' },
    });

    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async getUsersByArea(area: string): Promise<Omit<User, 'password'>[]> {
    const users = await userRepository.find({
      where: { area, status: true },
      order: { createdAt: 'DESC' },
    });

    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async updateUserStatus(id: string, status: boolean): Promise<Omit<User, 'password'> | null> {
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return null;
    }

    user.status = status;
    const savedUser = await userRepository.save(user);

    const { password, ...userWithoutPassword } = savedUser;

    return userWithoutPassword;
  }

  static async resetPassword(id: string, newPassword: string): Promise<boolean> {
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await userRepository.save(user);

    return true;
  }
}

export default UserService;
