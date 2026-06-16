/**
 * Display name for notification actor/recipient namespaces.
 */
export function getNotificationUserDisplayName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  if (user.displayName) {
    return user.displayName;
  }
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  if (fullName) {
    return fullName;
  }
  return user.username ?? user.email ?? 'User';
}
