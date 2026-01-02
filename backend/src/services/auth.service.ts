// Auth service: handles authentication and user validation
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { User, UserRole } from '../types/common.types';

const JWT_SECRET = process.env['JWT_SECRET'] || 'cleardeal-secret-key';
const JWT_EXPIRY = process.env['JWT_EXPIRY'] || '7d';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface LoginResult {
  user: User;
  token: string;
  expiresIn: string;
}

export async function authenticate(token: string): Promise<AuthPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await userRepository.findUserById(decoded.userId);
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  } catch (err) {
    console.error('[AuthService] Token verification failed:', err);
    return null;
  }
}

export async function login(email: string, password: string): Promise<LoginResult | null> {
  const user = await userRepository.findByEmail(email);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, (user as any).passwordHash || '');
  if (!isValid) return null;

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return { user, token, expiresIn: JWT_EXPIRY };
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  organizationId?: string;
}): Promise<User> {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const newUser: User = {
    id: `user_${Date.now()}`,
    name: data.name,
    email: data.email,
    role: data.role || UserRole.AGENT,
    organizationId: data.organizationId,
  };

  return userRepository.create({ ...newUser, passwordHash } as any);
}

export async function authorize(user: User, requiredRoles: UserRole[]): Promise<boolean> {
  return requiredRoles.includes(user.role);
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function decodeToken(token: string): AuthPayload | null {
  try {
    return jwt.decode(token) as AuthPayload;
  } catch {
    return null;
  }
}
