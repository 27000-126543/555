import * as dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app';
import SocketService from './services/socket.service';
import { appConfig } from './config';

dotenv.config();

const server = createServer(app);

const PORT = appConfig.port;

server.listen(PORT, () => {
  console.log(`🚀 服务已启动`);
  console.log(`📍  HTTP 服务: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`📅 当前环境: ${appConfig.env}`);
});

SocketService.init(server);

export default server;
