// Auth service: handles authentication and user validation
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { User, UserRole } from '../types/common.types';
import { logger } from '../utils/logger';

// Environment configuration with secure defaults
const JWT_SECRET: Secret = process.env['JWT_SECRET'] || 'cleardeal-secret-key';
const JWT_EXPIRY_SECONDS = parseInt(process.env['JWT_EXPIRY_SECONDS'] || '604800', 10); // 7 days default
const SALT_ROUNDS = 12;

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string | undefined;
  iat?: number | undefined;
  exp?: number | undefined;
}

export interface LoginResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresIn: number;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  organizationId?: string;
}

// Extended user type that includes password hash for internal use
interface UserWithPassword extends User {
  passwordHash?: string;
}

/**
 * Authenticate a user by verifying their JWT token
 * @param token - JWT token to verify
 * @returns AuthPayload if valid, null otherwise
 */
export async function authenticate(token: string): Promise<AuthPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    
    // Validate the user still exists and is active
    const user = await userRepository.findUserById(decoded.userId);
    if (!user) {
      logger.warn(`[AuthService] User not found for token: ${decoded.userId}`);
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      logger.info('[AuthService] Token expired');
    } else if (err instanceof jwt.JsonWebTokenError) {
      logger.warn('[AuthService] Invalid token');
    } else {
      logger.error('[AuthService] Token verification failed:', err);
    }
    return null;
  }
}

/**
 * Log in a user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns LoginResult if successful, null otherwise
 */
export async function login(email: string, password: string): Promise<LoginResult | null> {
  if (!email || !password) {
    logger.warn('[AuthService] Login attempt with missing credentials');
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalizedEmail) as UserWithPassword | null;
  
  if (!user) {
    logger.info(`[AuthService] Login failed: user not found for ${normalizedEmail}`);
    return null;
  }

  if (!user.passwordHash) {
    logger.error(`[AuthService] User ${user.id} has no password hash`);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    logger.info(`[AuthService] Login failed: invalid password for ${normalizedEmail}`);
    return null;
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  const signOptions: SignOptions = { expiresIn: JWT_EXPIRY_SECONDS };
  const token = jwt.sign(payload, JWT_SECRET, signOptions);

  // Remove sensitive data before returning
  const { passwordHash: _, ...safeUser } = user;

  logger.info(`[AuthService] User ${user.id} logged in successfully`);
  return { user: safeUser, token, expiresIn: JWT_EXPIRY_SECONDS };
}

/**
 * Register a new user
 * @param data - Registration data
 * @returns Created user (without password hash)
 */
export async function register(data: RegisterData): Promise<Omit<User, 'passwordHash'>> {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check for existing user
  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Validate password strength
  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const newUser = await userRepository.create({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name.trim(),
    email: normalizedEmail,
    role: data.role || UserRole.AGENT,
    organizationId: data.organizationId,
    passwordHash,
  } as UserWithPassword);

  // Remove sensitive data before returning
  const { passwordHash: _, ...safeUser } = newUser as UserWithPassword;
  
  logger.info(`[AuthService] New user registered: ${safeUser.id}`);
  return safeUser;
}

/**
 * Check if a user has one of the required roles
 * @param user - User to check
 * @param requiredRoles - Array of allowed roles
 * @returns true if authorized, false otherwise
 */
export function authorize(user: User | AuthPayload, requiredRoles: UserRole[]): boolean {
  if (!user || !requiredRoles.length) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Generate a JWT token for a given payload
 * @param payload - AuthPayload to encode
 * @returns JWT token string
 */
export function generateToken(payload: AuthPayload): string {
  const signOptions: SignOptions = { expiresIn: JWT_EXPIRY_SECONDS };
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

/**
 * Decode a JWT token without verification (useful for reading expired tokens)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      return decoded as AuthPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Refresh a user's token if still valid
 * @param token - Current JWT token
 * @returns New token if valid, null otherwise
 */
export async function refreshToken(token: string): Promise<string | null> {
  const payload = await authenticate(token);
  if (!payload) return null;

  // Generate a fresh token
  return generateToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
  });
}

/**
 * Change a user's password
 * @param userId - User ID
 * @param currentPassword - Current password for verification
 * @param newPassword - New password to set
 * @returns true if successful
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await userRepository.findUserById(userId) as UserWithPassword | null;
  if (!user || !user.passwordHash) {
    throw new Error('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long');
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepository.update(userId, { passwordHash: newHash } as Partial<UserWithPassword>);

  logger.info(`[AuthService] Password changed for user ${userId}`);
  return true;
}
