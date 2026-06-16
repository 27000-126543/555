import { Role } from '../types';

export const FAULT_TYPES = [
  { value: 'bulb_burnout', label: '灯泡烧坏' },
  { value: 'ballast_failure', label: '镇流器故障' },
  { value: 'line_fault', label: '线路故障' },
  { value: 'pole_damage', label: '灯杆损坏' },
  { value: 'control_system', label: '控制系统故障' },
  { value: 'sensor_failure', label: '传感器故障' },
  { value: 'power_outage', label: '电源断电' },
  { value: 'other', label: '其他故障' },
] as const;

export type FaultType = (typeof FAULT_TYPES)[number]['value'];

export const FAULT_LEVELS = [
  { value: 'low', label: '低', color: '#52c41a' },
  { value: 'medium', label: '中', color: '#faad14' },
  { value: 'urgent', label: '紧急', color: '#ff4d4f' },
] as const;

export const LIGHT_STATUSES = [
  { value: 'normal', label: '正常', color: '#52c41a' },
  { value: 'fault', label: '故障', color: '#ff4d4f' },
  { value: 'maintaining', label: '维护中', color: '#faad14' },
] as const;

export const ORDER_STATUSES = [
  { value: 'pending', label: '待分配', color: '#8c8c8c' },
  { value: 'assigned', label: '已分配', color: '#1890ff' },
  { value: 'accepted', label: '已接单', color: '#722ed1' },
  { value: 'processing', label: '处理中', color: '#faad14' },
  { value: 'completed', label: '已完成', color: '#52c41a' },
  { value: 'cancelled', label: '已取消', color: '#bfbfbf' },
  { value: 'verified', label: '已验收', color: '#13c2c2' },
] as const;

export const NOTIFICATION_TYPES = [
  { value: 'work_order', label: '工单通知', icon: 'order' },
  { value: 'maintenance', label: '维护通知', icon: 'tool' },
  { value: 'energy_alert', label: '能耗告警', icon: 'alert' },
  { value: 'report', label: '报告通知', icon: 'file' },
  { value: 'system', label: '系统通知', icon: 'system' },
] as const;

export const ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'inspector', label: '巡检员', description: '负责日常巡检、记录照明情况' },
  { value: 'maintainer', label: '维修员', description: '负责故障维修、设备维护' },
  { value: 'finance', label: '财务人员', description: '负责能耗统计、费用核算' },
  { value: 'admin', label: '管理员', description: '系统管理、用户管理、权限配置' },
] as const;

export const PERMISSION_MAP: Record<string, string> = {
  'user:create': '创建用户',
  'user:read': '查看用户',
  'user:update': '编辑用户',
  'user:delete': '删除用户',
  'role:manage': '角色管理',
  'inspection:create': '创建巡检记录',
  'inspection:read': '查看巡检记录',
  'inspection:update': '编辑巡检记录',
  'inspection:delete': '删除巡检记录',
  'inspection:*': '巡检管理全部权限',
  'work_order:create': '创建工单',
  'work_order:read': '查看工单',
  'work_order:assign': '分配工单',
  'work_order:accept': '接单',
  'work_order:update': '更新工单',
  'work_order:complete': '完成工单',
  'work_order:verify': '验收工单',
  'work_order:cancel': '取消工单',
  'work_order:*': '工单管理全部权限',
  'light:create': '添加路灯',
  'light:read': '查看路灯',
  'light:update': '编辑路灯',
  'light:delete': '删除路灯',
  'light:update_status': '更新路灯状态',
  'light:*': '路灯管理全部权限',
  'fault:report': '上报故障',
  'fault:read': '查看故障',
  'fault:resolve': '处理故障',
  'fault:*': '故障管理全部权限',
  'energy:read': '查看能耗数据',
  'energy:record': '录入能耗数据',
  'energy:export': '导出能耗报告',
  'energy:alert': '能耗告警管理',
  'energy:*': '能耗管理全部权限',
  'maintenance:create': '创建维护记录',
  'maintenance:read': '查看维护记录',
  'maintenance:update': '编辑维护记录',
  'maintenance:delete': '删除维护记录',
  'maintenance:*': '维护管理全部权限',
  'report:generate': '生成报告',
  'report:export': '导出报告',
  'report:read': '查看报告',
  'report:*': '报告管理全部权限',
  'notification:read': '查看通知',
  'notification:send': '发送通知',
  'notification:*': '通知管理全部权限',
  'system:configure': '系统配置',
};

export const ENERGY_COEFFICIENTS = {
  activePowerFactor: 0.95,
  lineLossCoefficient: 0.05,
  powerFactorPenalty: 0.85,
  voltageDeviationFactor: 1.0,
  electricityPrice: parseFloat(process.env.ELECTRICITY_PRICE || '0.65'),
  nightDurationHours: 12,
  annualOperatingDays: 365,
  averagePowerFactor: 0.9,
  voltageRating: 220,
  currentRatingMultiplier: 1.1,
} as const;

export const POLE_TYPES = [
  { value: 'single_arm', label: '单臂灯杆' },
  { value: 'double_arm', label: '双臂灯杆' },
  { value: 'multi_arm', label: '多臂灯杆' },
  { value: 'court', label: '球场灯杆' },
  { value: 'landscape', label: '景观灯杆' },
  { value: 'solar', label: '太阳能灯杆' },
] as const;

export const LIGHT_TYPES = [
  { value: 'led', label: 'LED灯', efficiency: 0.9 },
  { value: 'high_pressure_sodium', label: '高压钠灯', efficiency: 0.6 },
  { value: 'metal_halide', label: '金卤灯', efficiency: 0.55 },
  { value: 'fluorescent', label: '荧光灯', efficiency: 0.7 },
  { value: 'incandescent', label: '白炽灯', efficiency: 0.2 },
  { value: 'solar_led', label: '太阳能LED', efficiency: 0.95 },
] as const;

export const MAINTENANCE_TYPES = [
  { value: 'routine', label: '例行维护' },
  { value: 'repair', label: '故障维修' },
  { value: 'replacement', label: '部件更换' },
] as const;

export const REPORT_TYPES = [
  { value: 'inspection', label: '巡检报告' },
  { value: 'maintenance', label: '维护报告' },
  { value: 'energy', label: '能耗报告' },
  { value: 'fault', label: '故障报告' },
  { value: 'comprehensive', label: '综合报告' },
] as const;

export const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF格式', extension: '.pdf' },
  { value: 'excel', label: 'Excel格式', extension: '.xlsx' },
] as const;

export default {
  FAULT_TYPES,
  FAULT_LEVELS,
  LIGHT_STATUSES,
  ORDER_STATUSES,
  NOTIFICATION_TYPES,
  ROLES,
  PERMISSION_MAP,
  ENERGY_COEFFICIENTS,
  POLE_TYPES,
  LIGHT_TYPES,
  MAINTENANCE_TYPES,
  REPORT_TYPES,
  REPORT_FORMATS,
};
