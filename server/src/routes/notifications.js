import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);
router.get('/', getNotifications);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
