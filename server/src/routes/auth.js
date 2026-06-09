import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateProfile, changePassword, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again after 15 minutes.' },
});

router.post('/register', authLimiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^\+?[1-9]\d{9,14}$/).withMessage('Valid phone number required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['contractor', 'supervisor', 'compliance_officer']).withMessage('Invalid role'),
  body('contractorId').optional({ values: 'falsy' }).isMongoId().withMessage('Valid contractorId required for non-contractor roles'),
], register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
