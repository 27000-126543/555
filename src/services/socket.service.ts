import { Server, Socket } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';

interface UserSocketInfo {
  socketId: string;
  userId: string;
  role: UserRole;
  connectedAt: Date;
}

const userRepository = AppDataSource.getRepository(User);

export class SocketService {
  private static io: Server;
  private static httpServer: HttpServer;
  private static onlineUsers: Map<string, UserSocketInfo> = new Map();
  private static userSockets: Map<string, Set<string>> = new Map();

  static init(server?: HttpServer): Server {
    if (!server) {
      SocketService.httpServer = createServer();
    } else {
      SocketService.httpServer = server;
    }

    SocketService.io = new Server(SocketService.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    SocketService.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('未提供认证令牌'));
        }

        const decoded = jwt.verify(token, jwtConfig.secret) as { userId: string; username: string; role: UserRole };
        
        const user = await userRepository.findOne({ where: { id: decoded.userId } });
        if (!user || !user.status) {
          return next(new Error('用户不存在或已被禁用'));
        }

        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        next();
      } catch (error) {
        next(new Error('认证失败'));
      }
    });

    SocketService.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const role = socket.data.role;

      SocketService.onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId,
        role,
        connectedAt: new Date(),
      });

      if (!SocketService.userSockets.has(userId)) {
        SocketService.userSockets.set(userId, new Set());
      }
      SocketService.userSockets.get(userId)!.add(socket.id);

      console.log(`用户 ${userId} 连接，Socket ID: ${socket.id}`);

      socket.emit('connected', {
        message: '连接成功',
        userId,
        onlineCount: SocketService.getOnlineCount(),
      });

      socket.on('disconnect', () => {
        SocketService.handleDisconnect(socket.id, userId);
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });

    return SocketService.io;
  }

  private static handleDisconnect(socketId: string, userId: string): void {
    SocketService.onlineUsers.delete(socketId);

    const userSocketSet = SocketService.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        SocketService.userSockets.delete(userId);
      }
    }

    console.log(`用户 ${userId} 断开连接，Socket ID: ${socketId}`);
  }

  static sendToUser(userId: string, event: string, data: unknown): boolean {
    const socketIds = SocketService.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) {
      return false;
    }

    socketIds.forEach((socketId) => {
      SocketService.io.to(socketId).emit(event, data);
    });

    return true;
  }

  static sendToAdmins(event: string, data: unknown): number {
    let count = 0;
    SocketService.onlineUsers.forEach((info) => {
      if (info.role === UserRole.ADMIN) {
        SocketService.io.to(info.socketId).emit(event, data);
        count++;
      }
    });
    return count;
  }

  static sendToRole(role: UserRole, event: string, data: unknown): number {
    let count = 0;
    SocketService.onlineUsers.forEach((info) => {
      if (info.role === role) {
        SocketService.io.to(info.socketId).emit(event, data);
        count++;
      }
    });
    return count;
  }

  static sendToAll(event: string, data: unknown): number {
    SocketService.io.emit(event, data);
    return SocketService.onlineUsers.size;
  }

  static isUserOnline(userId: string): boolean {
    return SocketService.userSockets.has(userId) && SocketService.userSockets.get(userId)!.size > 0;
  }

  static getOnlineCount(): number {
    return SocketService.onlineUsers.size;
  }

  static getOnlineUsers(): UserSocketInfo[] {
    return Array.from(SocketService.onlineUsers.values());
  }

  static getUserSocketIds(userId: string): string[] {
    const socketIds = SocketService.userSockets.get(userId);
    return socketIds ? Array.from(socketIds) : [];
  }

  static getIo(): Server {
    if (!SocketService.io) {
      throw new Error('Socket.IO 未初始化，请先调用 init() 方法');
    }
    return SocketService.io;
  }

  static getHttpServer(): HttpServer {
    if (!SocketService.httpServer) {
      throw new Error('HTTP 服务器未初始化，请先调用 init() 方法');
    }
    return SocketService.httpServer;
  }

  static disconnectUser(userId: string): boolean {
    const socketIds = SocketService.userSockets.get(userId);
    if (!socketIds) {
      return false;
    }

    socketIds.forEach((socketId) => {
      const socket = SocketService.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    return true;
  }
}

export default SocketService;
