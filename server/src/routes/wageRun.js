import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { contractorOnly } from '../middleware/roleGuard.js';
import {
  generateWageRun, getWageRuns, getWageRun, approveWageRun, markPaid,
  downloadMusterRoll, downloadWageSlip, generateAppointmentLetterPDF, exportEPFECR,
} from '../controllers/wageRunController.js';

const router = Router();

router.use(authenticate);

router.post('/generate', contractorOnly, [
  body('siteId').isMongoId().withMessage('Valid site ID required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year required'),
], generateWageRun);

router.get('/', getWageRuns);
router.get('/:id', getWageRun);

router.post('/:id/approve', contractorOnly, approveWageRun);
router.post('/:id/mark-paid', contractorOnly, [
  body('paymentReference').optional().isString(),
], markPaid);

router.get('/:id/muster-roll', downloadMusterRoll);
router.get('/:id/ecr', exportEPFECR);
router.get('/:wageRunId/wage-slip/:workerId', downloadWageSlip);

router.get('/appointment-letter/:workerId', contractorOnly, generateAppointmentLetterPDF);

export default router;
