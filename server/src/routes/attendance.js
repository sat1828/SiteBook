import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { markAttendance, bulkMarkAttendance, getAttendance, getDailyAttendance, getSiteAttendanceSummary } from '../controllers/attendanceController.js';

const router = Router();

router.use(authenticate);

router.post('/', [
  body('workerId').isMongoId().withMessage('Valid worker ID required'),
  body('siteId').isMongoId().withMessage('Valid site ID required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('status').isIn(['full', 'half', 'absent', 'overtime']).withMessage('Valid status required'),
], markAttendance);

router.post('/bulk', bulkMarkAttendance);
router.get('/', getAttendance);
router.get('/daily/:siteId/:date', getDailyAttendance);
router.get('/summary', getSiteAttendanceSummary);

export default router;
