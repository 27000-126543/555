import dayjs from 'dayjs';

let orderCounter = 0;

export const generateOrderNo = (): string => {
  const datePart = dayjs().format('YYYYMMDD');
  orderCounter = (orderCounter + 1) % 1000000;
  const seqPart = orderCounter.toString().padStart(6, '0');
  return `WO${datePart}${seqPart}`;
};

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDate = (
  date: Date | string | number | dayjs.Dayjs | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!date) return '';
  return dayjs(date).format(format);
};

export const parseDate = (dateStr: string | number | Date): dayjs.Dayjs => {
  return dayjs(dateStr);
};

export const generateRandomCode = (length: number = 6): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const calculateDuration = (
  start: Date | string | number,
  end: Date | string | number
): number => {
  const startTime = dayjs(start).valueOf();
  const endTime = dayjs(end).valueOf();
  const diffMs = endTime - startTime;
  return diffMs / (1000 * 60 * 60);
};

export const roundToDecimals = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

export default {
  generateOrderNo,
  calculateDistance,
  formatDate,
  parseDate,
  generateRandomCode,
  validatePhone,
  validateEmail,
  calculateDuration,
  roundToDecimals,
};
