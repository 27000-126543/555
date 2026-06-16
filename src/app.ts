import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { initializeDatabase } from './config/database';
import SocketService from './services/socket.service';
import FinanceService from './services/finance.service';
import response from './utils/response';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import inspectionRoutes from './routes/inspection.routes';
import workorderRoutes from './routes/workorder.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import partRoutes from './routes/part.routes';
import streetlightRoutes from './routes/streetlight.routes';
import energyRoutes from './routes/energy.routes';
import areaConfigRoutes from './routes/areaconfig.routes';
import financeRoutes from './routes/finance.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

initializeDatabase();
SocketService.init();
FinanceService.initializeCronJobs();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/workorders', workorderRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/streetlights', streetlightRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/area-configs', areaConfigRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json(response.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }, '服务运行正常'));
});

app.use((req: Request, res: Response) => {
  res.status(404).json(response.error('请求的资源不存在', 404));
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err.stack || err.message);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json(response.error('未授权，请先登录', 401));
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json(response.error('数据验证失败', 400));
  }
  
  res.status(500).json(response.error('服务器内部错误', 500));
});

export default app;
