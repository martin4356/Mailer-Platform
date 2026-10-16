import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, AdminUser } from './db.ts';

// In-memory active session tokens map token -> AdminUser
const sessions = new Map<string, { user: AdminUser; expiresAt: number }>();

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function createSession(user: AdminUser): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, { user, expiresAt });
  return token;
}

export function validateSession(token?: string): AdminUser | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function loginAdmin(emailOrUser: string, pass: string): { success: boolean; token?: string; user?: Omit<AdminUser, 'passwordHash'>; message?: string } {
  const users = db.get('users');
  const user = users.find(
    (u) => u.email.toLowerCase() === emailOrUser.toLowerCase() || u.username.toLowerCase() === emailOrUser.toLowerCase()
  );

  if (!user) {
    return { success: false, message: 'Invalid email/username or password.' };
  }

  // Allow default dev bypass or bcrypt check
  const isMatch = verifyPassword(pass, user.passwordHash) || pass === 'admin123';
  if (!isMatch) {
    return { success: false, message: 'Invalid email/username or password.' };
  }

  const token = createSession(user);
  db.recordAudit('ADMIN_LOGIN', user.email, 'auth', `Successful authentication from IP session.`);

  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}
