export type Role = 'inspector' | 'maintainer' | 'finance' | 'admin';

export type FaultLevel = 'low' | 'medium' | 'urgent';

export type LightStatus = 'normal' | 'fault' | 'maintaining';

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'verified';

export type NotificationType =
  | 'work_order'
  | 'maintenance'
  | 'energy_alert'
  | 'report'
  | 'system';

export interface JwtPayload {
  userId: number;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  realName: string;
  role: Role;
  phone: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  realName: string;
  role: Role;
  phone: string;
  email?: string;
}

export interface UserUpdateRequest {
  realName?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface UserResponse {
  id: number;
  username: string;
  realName: string;
  role: Role;
  phone: string;
  email?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionRequest {
  lightId: number;
  inspectionDate: Date;
  appearance: string;
  brightness: string;
  wiring: string;
  poleCondition: string;
  remarks?: string;
  images?: string[];
}

export interface InspectionResponse {
  id: number;
  lightId: number;
  lightName: string;
  inspectorId: number;
  inspectorName: string;
  inspectionDate: Date;
  appearance: string;
  brightness: string;
  wiring: string;
  poleCondition: string;
  remarks?: string;
  images?: string[];
  hasFault: boolean;
  faultDescription?: string;
  createdAt: Date;
}

export interface WorkOrderCreateRequest {
  lightId: number;
  faultType: string;
  faultLevel: FaultLevel;
  description: string;
  images?: string[];
  priority?: number;
}

export interface WorkOrderAssignRequest {
  orderId: number;
  maintainerId: number;
  expectedTime?: Date;
}

export interface WorkOrderUpdateRequest {
  status?: OrderStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
  solution?: string;
  replacementParts?: string;
  cost?: number;
  remark?: string;
  images?: string[];
}

export interface WorkOrderResponse {
  id: number;
  orderNo: string;
  lightId: number;
  lightName: string;
  lightLocation: string;
  faultType: string;
  faultLevel: FaultLevel;
  description: string;
  images?: string[];
  reporterId: number;
  reporterName: string;
  reporterRole: Role;
  maintainerId?: number;
  maintainerName?: string;
  status: OrderStatus;
  priority: number;
  expectedTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  solution?: string;
  replacementParts?: string;
  cost?: number;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LightCreateRequest {
  name: string;
  location: string;
  longitude: number;
  latitude: number;
  poleType: string;
  lightType: string;
  power: number;
  installationDate: Date;
  manufacturer?: string;
  model?: string;
  remark?: string;
}

export interface LightUpdateRequest {
  name?: string;
  location?: string;
  longitude?: number;
  latitude?: number;
  status?: LightStatus;
  poleType?: string;
  lightType?: string;
  power?: number;
  manufacturer?: string;
  model?: string;
  remark?: string;
}

export interface LightResponse {
  id: number;
  name: string;
  location: string;
  longitude: number;
  latitude: number;
  status: LightStatus;
  poleType: string;
  lightType: string;
  power: number;
  installationDate: Date;
  manufacturer?: string;
  model?: string;
  lastInspectionDate?: Date;
  lastMaintenanceDate?: Date;
  totalRunningHours: number;
  totalEnergyConsumption: number;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnergyRecordRequest {
  lightId: number;
  recordDate: Date;
  voltage: number;
  current: number;
  powerFactor: number;
  durationHours: number;
}

export interface EnergyRecordResponse {
  id: number;
  lightId: number;
  lightName: string;
  recordDate: Date;
  voltage: number;
  current: number;
  powerFactor: number;
  activePower: number;
  durationHours: number;
  energyConsumption: number;
  cost: number;
  createdAt: Date;
}

export interface EnergyStatisticsRequest {
  startDate: Date;
  endDate: Date;
  lightId?: number;
  groupBy?: 'day' | 'week' | 'month';
}

export interface EnergyStatisticsResponse {
  totalEnergy: number;
  totalCost: number;
  averageDailyEnergy: number;
  efficiencyRate: number;
  peakUsage: {
    date: Date;
    energy: number;
  };
  details: Array<{
    period: string;
    energy: number;
    cost: number;
    lightCount: number;
  }>;
}

export interface MaintenanceCreateRequest {
  lightId: number;
  maintenanceType: 'routine' | 'repair' | 'replacement';
  description: string;
  parts?: string[];
  cost?: number;
  maintenanceDate: Date;
  operator?: string;
  remark?: string;
}

export interface MaintenanceResponse {
  id: number;
  lightId: number;
  lightName: string;
  maintenanceType: 'routine' | 'repair' | 'replacement';
  description: string;
  parts?: string[];
  cost: number;
  maintenanceDate: Date;
  operator?: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  relatedType?: string;
  isRead: boolean;
  senderId?: number;
  senderName?: string;
  receiverId: number;
  createdAt: Date;
  readAt?: Date;
}

export interface ReportGenerateRequest {
  type: 'inspection' | 'maintenance' | 'energy' | 'fault' | 'comprehensive';
  startDate: Date;
  endDate: Date;
  format: 'pdf' | 'excel';
  lightIds?: number[];
}

export interface ReportResponse {
  id: number;
  reportNo: string;
  type: string;
  title: string;
  startDate: Date;
  endDate: Date;
  filePath: string;
  fileSize: number;
  generatedBy: number;
  generatedByName: string;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface ErrorResponse {
  success: false;
  code: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  timestamp: number;
}
