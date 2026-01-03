// Auth controller: Handles authentication HTTP requests
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  organizationId?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Extend Express Request to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: authService.AuthPayload;
}

// ============================================================================
// Login
// ============================================================================

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
export async function login(
  req: Request<object, object, LoginRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    const result = await authService.login(email, password);

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    logger.error('[AuthController] Login error:', error);
    next(error);
  }
}

// ============================================================================
// Register
// ============================================================================

/**
 * POST /auth/register
 * Register a new user account
 */
export async function register(
  req: Request<object, object, RegisterRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, role, organizationId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    const user = await authService.register({
      name,
      email,
      password,
      role: role as authService.RegisterData['role'],
      organizationId,
    });

    res.status(201).json({
      success: true,
      data: { user },
      message: 'User registered successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('Password must be')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }
    logger.error('[AuthController] Registration error:', error);
    next(error);
  }
}

// ============================================================================
// Token Operations
// ============================================================================

/**
 * POST /auth/refresh
 * Refresh the current JWT token
 */
export async function refreshToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const newToken = await authService.refreshToken(token);

    if (!newToken) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    logger.error('[AuthController] Token refresh error:', error);
    next(error);
  }
}

/**
 * GET /auth/verify
 * Verify current token and return user info
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const payload = await authService.authenticate(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      },
    });
  } catch (error) {
    logger.error('[AuthController] Token verification error:', error);
    next(error);
  }
}

// ============================================================================
// Password Management
// ============================================================================

/**
 * POST /auth/change-password
 * Change the current user's password
 */
export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('incorrect') || error.message.includes('not found')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('at least')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }
    logger.error('[AuthController] Change password error:', error);
    next(error);
  }
}

// ============================================================================
// Logout
// ============================================================================

/**
 * POST /auth/logout
 * Logout current user (client-side token removal)
 */
export async function logout(
  _req: Request,
  res: Response
): Promise<void> {
  // JWT is stateless, so we just acknowledge the logout
  // Client should remove the token from storage
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

// ============================================================================
// Profile
// ============================================================================

/**
 * GET /auth/me
 * Get current authenticated user's profile
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId,
      },
    });
  } catch (error) {
    logger.error('[AuthController] Get profile error:', error);
    next(error);
  }
}
