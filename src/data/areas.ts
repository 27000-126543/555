export interface Area {
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
}

export const areas: Area[] = [
  {
    name: '朝阳区',
    code: 'CY',
    centerLat: 39.9219,
    centerLng: 116.4438,
  },
  {
    name: '海淀区',
    code: 'HD',
    centerLat: 39.9593,
    centerLng: 116.2984,
  },
  {
    name: '东城区',
    code: 'DC',
    centerLat: 39.9281,
    centerLng: 116.4164,
  },
  {
    name: '西城区',
    code: 'XC',
    centerLat: 39.9151,
    centerLng: 116.3633,
  },
  {
    name: '丰台区',
    code: 'FT',
    centerLat: 39.8585,
    centerLng: 116.2869,
  },
  {
    name: '石景山区',
    code: 'SJS',
    centerLat: 39.9057,
    centerLng: 116.2229,
  },
  {
    name: '通州区',
    code: 'TZ',
    centerLat: 39.9088,
    centerLng: 116.6568,
  },
  {
    name: '顺义区',
    code: 'SY',
    centerLat: 40.1305,
    centerLng: 116.6536,
  },
];

export const getAreaByName = (name: string): Area | undefined => {
  return areas.find(area => area.name === name);
};

export const getAreaByCode = (code: string): Area | undefined => {
  return areas.find(area => area.code === code);
};

export default areas;
