import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { contractorOnly } from '../middleware/roleGuard.js';
import {
  createWorker, bulkCreateWorkers, getWorkers, getWorker, updateWorker, deleteWorker,
} from '../controllers/workerController.js';

const router = Router();

router.use(authenticate);

router.post('/', contractorOnly, [
  body('name').trim().notEmpty().withMessage('Worker name is required'),
  body('skill').isIn(['unskilled', 'semi_skilled', 'skilled', 'highly_skilled']).withMessage('Valid skill required'),
  body('siteId').isMongoId().withMessage('Valid site ID required'),
  body('agreedRate').isFloat({ min: 0 }).withMessage('Valid wage rate required'),
], createWorker);

router.post('/bulk', contractorOnly, bulkCreateWorkers);
router.get('/', getWorkers);
router.get('/:id', getWorker);
router.patch('/:id', contractorOnly, [
  body('name').optional().trim().notEmpty().withMessage('Worker name cannot be empty'),
  body('skill').optional().isIn(['unskilled', 'semi_skilled', 'skilled', 'highly_skilled']).withMessage('Valid skill required'),
  body('agreedRate').optional().isFloat({ min: 0 }).withMessage('Valid wage rate required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
], updateWorker);
router.delete('/:id', contractorOnly, deleteWorker);

export default router;
