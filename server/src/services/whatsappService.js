import env from '../config/env.js';
import { generatePayslipToken } from '../utils/helpers.js';

let twilioClient = null;

const getTwilioClient = async () => {
  if (twilioClient) return twilioClient;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio not configured. WhatsApp messages will be logged only.');
    return null;
  }
  const { default: twilio } = await import('twilio');
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return twilioClient;
};

export const sendPayslipWhatsApp = async (workerPhone, workerId, wageRunId, workerName) => {
  try {
    if (!workerPhone) {
      console.warn(`[WhatsApp] No phone for worker ${workerName || workerId}. Skipping.`);
      return { sent: false, error: 'No phone number' };
    }

    const token = generatePayslipToken(workerId, wageRunId);
    const link = `${env.CLIENT_URL}/worker/payslip?token=${token}`;

    const message = `🏗️ *SiteBook - Wage Slip*\n\n`
      + `Hello ${workerName},\n\n`
      + `Your wage slip for this month is ready.\n\n`
      + `🔗 *View your wage slip:*\n${link}\n\n`
      + `No app download needed. Open the link on your phone.\n\n`
      + `Powered by SiteBook`;

    const client = await getTwilioClient();
    if (!client) {
      console.log(`[WhatsApp Mock] To: ${workerPhone} | Message: ${message}`);
      return { sent: false, mock: true };
    }

    const phone = String(workerPhone);
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
    const fromRaw = String(env.TWILIO_WHATSAPP_FROM || '');
    const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:+14155238886`;

    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    console.log(`WhatsApp sent to ${workerPhone}: ${result.sid}`);
    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error('WhatsApp send error:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendDisputeIntake = async (workerPhone) => {
  try {
    const message = [
      '👋 *SiteBook Dispute Support*',
      '',
      'Please reply with your dispute details:',
      '1. Your full name',
      '2. Site you worked at',
      '3. What issue you are facing',
      '',
      'Example: "Mera naam Ramesh hai. Bhubaneswar site par 3 din ka paisa nahi mila."',
    ].join('\n');

    const client = await getTwilioClient();
    if (!client) {
      console.log(`[WhatsApp Mock] Dispute intake to: ${workerPhone}`);
      return { sent: false, mock: true };
    }

    const to = workerPhone.startsWith('whatsapp:') ? workerPhone : `whatsapp:${workerPhone}`;
    const from = env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
      ? env.TWILIO_WHATSAPP_FROM
      : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

    const result = await client.messages.create({ body: message, from, to });
    return { sent: true, sid: result.sid };
  } catch (error) {
    console.error('Dispute intake error:', error.message);
    return { sent: false, error: error.message };
  }
};
