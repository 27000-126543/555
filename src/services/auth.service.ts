import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { jwtConfig } from '../config';

const userRepository = AppDataSource.getRepository(User);

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  realName: string;
  role: UserRole;
  phone?: string;
  email?: string;
  area?: string;
}

export interface ChangePasswordData {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export interface LoginResult {
  accessToken: string;
  user: Omit<User, 'password'>;
}

export class AuthService {
  static async login(data: LoginData): Promise<LoginResult> {
    const user = await userRepository.findOne({
      where: { username: data.username },
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    if (!user.status) {
      throw new Error('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    const accessToken = this.generateToken(user);

    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  static async register(data: RegisterData): Promise<Omit<User, 'password'>> {
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
    });

    const savedUser = await userRepository.save(user);

    const { password, ...userWithoutPassword } = savedUser;

    return userWithoutPassword;
  }

  static async changePassword(data: ChangePasswordData): Promise<boolean> {
    const user = await userRepository.findOne({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(
      data.oldPassword,
      user.password
    );

    if (!isOldPasswordValid) {
      throw new Error('原密码错误');
    }

    if (data.oldPassword === data.newPassword) {
      throw new Error('新密码不能与原密码相同');
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    user.password = hashedNewPassword;
    await userRepository.save(user);

    return true;
  }

  static generateToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm,
    } as any);
  }

  static async getUserById(userId: string): Promise<User | null> {
    return userRepository.findOne({
      where: { id: userId },
    });
  }
}

export default AuthService;
