import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const required = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
};

const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set these in server/.env or environment before starting.');
  process.exit(1);
}

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: required.MONGODB_URI,
  JWT_SECRET: required.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || '',
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SITE_DEFAULT_RADIUS: parseInt(process.env.SITE_DEFAULT_RADIUS, 10) || 200,
};

const optionalServices = [
  { name: 'Cloudinary', key: 'CLOUDINARY_CLOUD_NAME' },
  { name: 'Twilio', key: 'TWILIO_ACCOUNT_SID' },
  { name: 'Claude AI', key: 'CLAUDE_API_KEY' },
];

for (const svc of optionalServices) {
  if (!env[svc.key]) {
    console.warn(`[WARN] ${svc.name} not configured. ${svc.name} features will use mock/stub responses.`);
  }
}

export default env;
