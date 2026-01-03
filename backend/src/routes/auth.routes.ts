// Auth routes: Authentication and authorization endpoints
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Public Routes (No authentication required)
// ============================================================================

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
router.post('/login', authController.login);

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', authController.register);

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * POST /auth/refresh
 * Refresh the current JWT token
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /auth/verify
 * Verify current token and return user info
 */
router.get('/verify', authController.verifyToken);

/**
 * POST /auth/change-password
 * Change the current user's password (requires authentication)
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * POST /auth/logout
 * Logout current user
 */
router.post('/logout', authController.logout);

/**
 * GET /auth/me
 * Get current authenticated user's profile
 */
router.get('/me', authenticate, authController.getMe);

export default router;
