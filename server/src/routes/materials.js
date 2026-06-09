import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { contractorOnly } from '../middleware/roleGuard.js';
import { createMaterial, getMaterials, addTransaction, getLowStockAlerts } from '../controllers/materialController.js';

const router = Router();

router.use(authenticate);

router.post('/', contractorOnly, [
  body('siteId').isMongoId().withMessage('Valid site ID required'),
  body('name').trim().notEmpty().withMessage('Material name is required'),
  body('unit').isIn(['bags', 'kg', 'tonnes', 'units', 'pieces', 'litres', 'cubic_metre', 'truckload']).withMessage('Valid unit required'),
], createMaterial);

router.get('/', getMaterials);
router.get('/low-stock', getLowStockAlerts);
router.post('/:materialId/transaction', contractorOnly, addTransaction);

export default router;
