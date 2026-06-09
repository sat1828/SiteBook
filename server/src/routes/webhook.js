import { Router } from 'express';
import { whatsappWebhook } from '../controllers/webhookController.js';

const router = Router();

router.post('/whatsapp', whatsappWebhook);
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

export default router;
