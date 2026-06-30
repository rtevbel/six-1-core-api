/**
 * Resolved outbound notification target (platform user and/or direct email).
 */
export interface NotificationDeliveryTarget {
  /** Platform user id stored on the notification row. */
  userId: number;
  /** When set, email is sent to this address instead of the platform user's email. */
  destinationEmail?: string;
}
