import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getWorkerByPhone, getWorkerAttendance, getWorkerWageHistory, viewPayslipByToken,
} from '../controllers/workerPortalController.js';

const router = Router();

// Public routes (token-authenticated payslip view)
router.get('/payslip/view', viewPayslipByToken);

// Protected routes
router.get('/phone/:phone', authenticate, getWorkerByPhone);
router.get('/:workerId/attendance', authenticate, getWorkerAttendance);
router.get('/:workerId/wages', authenticate, getWorkerWageHistory);

export default router;
