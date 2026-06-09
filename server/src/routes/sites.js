import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { contractorOnly } from '../middleware/roleGuard.js';
import {
  createSite, getSites, getSite, updateSite, deleteSite, assignSupervisor,
} from '../controllers/siteController.js';

const router = Router();

router.use(authenticate);

router.post('/', contractorOnly, [
  body('name').trim().notEmpty().withMessage('Site name is required'),
  body('location').isObject().withMessage('Location is required'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates [lng, lat] required'),
  body('wageRates').isArray({ min: 1 }).withMessage('At least one wage rate required'),
], createSite);

router.get('/', getSites);
router.get('/:id', getSite);

router.patch('/:id', contractorOnly, [
  body('name').optional().trim().notEmpty().withMessage('Site name cannot be empty'),
  body('status').optional().isIn(['active', 'inactive', 'completed']).withMessage('Invalid status'),
], updateSite);
router.delete('/:id', contractorOnly, deleteSite);
router.post('/:id/assign-supervisor', contractorOnly, [
  body('supervisorId').isMongoId().withMessage('Valid supervisor ID required'),
], assignSupervisor);

export default router;
