/**
 * Notification send status type.
 */
export type NotificationSendStatus = 'sent' | 'failed';

/**
 * Result payload for sending a notification.
 */
export interface NotificationSendResult {
  status: NotificationSendStatus;
  response?: string;
}
