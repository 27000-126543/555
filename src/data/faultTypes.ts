export interface FaultType {
  code: string;
  name: string;
  description: string;
  estimatedRepairTime: number;
  requiredSkills: string[];
}

export const faultTypes: FaultType[] = [
  {
    code: 'BULB_BURNOUT',
    name: '灯泡烧坏',
    description: '灯泡灯丝断裂或老化导致不亮',
    estimatedRepairTime: 30,
    requiredSkills: ['登高作业', '电路基础'],
  },
  {
    code: 'BALLAST_FAILURE',
    name: '镇流器故障',
    description: '镇流器损坏或参数异常导致灯不亮或闪烁',
    estimatedRepairTime: 45,
    requiredSkills: ['电路维修', '电子技术'],
  },
  {
    code: 'WIRING_FAULT',
    name: '线路故障',
    description: '电线老化、破损、短路或接触不良',
    estimatedRepairTime: 60,
    requiredSkills: ['电路维修', '电工证'],
  },
  {
    code: 'CONTROLLER_FAULT',
    name: '控制器故障',
    description: '智能控制器损坏或程序异常',
    estimatedRepairTime: 40,
    requiredSkills: ['电子技术', '编程基础'],
  },
  {
    code: 'LAMPSHADE_DAMAGE',
    name: '灯罩破损',
    description: '灯罩因外力或老化导致破裂、变形',
    estimatedRepairTime: 25,
    requiredSkills: ['登高作业'],
  },
  {
    code: 'POLE_TILT',
    name: '灯杆倾斜',
    description: '灯杆因地基松动或外力导致倾斜',
    estimatedRepairTime: 90,
    requiredSkills: ['结构维修', '高空作业'],
  },
  {
    code: 'LEAKAGE_FAULT',
    name: '漏电故障',
    description: '线路绝缘破损导致灯杆或设备带电',
    estimatedRepairTime: 75,
    requiredSkills: ['电路维修', '电工证', '安全防护'],
  },
  {
    code: 'COMMUNICATION_FAULT',
    name: '通信故障',
    description: '智能路灯无法与监控中心通信',
    estimatedRepairTime: 50,
    requiredSkills: ['网络技术', '电子技术'],
  },
];

export const getFaultTypeByCode = (code: string): FaultType | undefined => {
  return faultTypes.find(type => type.code === code);
};

export const getFaultTypeByName = (name: string): FaultType | undefined => {
  return faultTypes.find(type => type.name === name);
};

export default faultTypes;
