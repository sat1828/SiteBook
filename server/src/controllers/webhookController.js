import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const whatsappWebhook = async (req, res, next) => {
  try {
    const { Body, From, SmsMessageSid } = req.body;

    if (!Body || !From) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const phone = From.replace('whatsapp:', '');
    const message = Body.trim().toLowerCase();

    if (message.startsWith('dispute') || message.startsWith('complaint')) {
      const contractor = await User.findOne({ role: 'contractor', isActive: true }).lean();
      if (!contractor) return res.status(404).json({ error: 'No contractor found' });

      await Notification.create({
        userId: contractor._id,
        contractorId: contractor._id,
        type: 'system',
        title: 'New Worker Dispute',
        message: `Worker from ${phone}: "${Body}"`,
        severity: 'warning',
        link: '/contractor/ai-insights',
      });
    }

    res.send(`<Response><Message>Thank you. Your message has been received. For disputes, our team will review shortly.</Message></Response>`);
  } catch (error) {
    next(error);
  }
};
