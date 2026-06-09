import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getComplianceReport, getDeadlines, getSiteCompliance, getDashboardStats } from '../controllers/complianceController.js';

const router = Router();

router.use(authenticate);

router.get('/report', getComplianceReport);
router.get('/deadlines', getDeadlines);
router.get('/dashboard', getDashboardStats);
router.get('/site/:siteId', getSiteCompliance);

export default router;
