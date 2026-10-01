import { AuthUser } from '../types';

export const ADMIN_EMAILS: string[] = [
  'mdtoyoburrahman243@gmail.com',
  'mdtayburrahman239@gmail.com',
  'toyoburrahman83@gmail.com',
  'toyoburrahman9090@gmail.com',
  'toyoburrahman526@gmail.com',
  'toyoburrahman560@gmail.com',
  'mdtayburrahman1111@gmail.com',
  'badsharahmanbd@gmail.com',
  'badsharahman250@gmail.com',
  'toyobur@telegram.bot'
];

/**
 * Robust check if a user has administrative privileges.
 * Checks role === 'admin' and matches email against verified admin email list.
 */
export function checkIsAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase().trim();
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase().trim() === email);
}
