import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { authRateLimit, registrationRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes with rate limiting
router.post('/register', registrationRateLimit, AuthController.register);
router.post('/login', authRateLimit, AuthController.login);
router.post('/refresh', authRateLimit, AuthController.refresh);

// Logout can work with or without authentication
router.post('/logout', optionalAuth, AuthController.logout);

// Protected routes
router.get('/sessions', requireAuth, AuthController.getSessions);

export default router;