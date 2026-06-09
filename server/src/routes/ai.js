import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { contractorOnly } from '../middleware/roleGuard.js';
import { resolveDispute, getAnomalies, getForecast } from '../controllers/aiController.js';

const router = Router();

router.use(authenticate);

router.post('/resolve-dispute', contractorOnly, resolveDispute);
router.get('/anomalies', contractorOnly, getAnomalies);
router.get('/forecast', contractorOnly, getForecast);

export default router;
