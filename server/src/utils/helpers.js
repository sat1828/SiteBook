import crypto from 'crypto';
import PayslipToken from '../models/PayslipToken.js';

export const generateTokenId = () => crypto.randomUUID();

export const sanitizePhone = (phone) => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
};

export const parseDateSafe = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

export const startOfMonth = (year, month) =>
  new Date(year, month - 1, 1, 0, 0, 0, 0);

export const endOfMonth = (year, month) =>
  new Date(year, month, 0, 23, 59, 59, 999);

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const generatePayslipToken = async (workerId, wageRunId) => {
  const token = crypto.randomBytes(32).toString('hex');
  await PayslipToken.create({ token, workerId, wageRunId });
  return token;
};

export const decodePayslipToken = async (token) => {
  if (!token) return null;
  const entry = await PayslipToken.findOne({ token }).lean();
  if (!entry) return null;
  return { workerId: String(entry.workerId), wageRunId: String(entry.wageRunId) };
};
