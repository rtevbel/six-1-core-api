import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationSendResult } from '../interfaces/notification-send-result.interface';
import { UserService } from '../../users/users.service';
import { UserMetaService } from '../../users/user-meta/user-meta.service';
import {
  NOTIFICATION_SMTP_FROM_EMAIL_KEY,
  NOTIFICATION_SMTP_FROM_NAME_KEY,
  NOTIFICATION_SMTP_HOST_KEY,
  NOTIFICATION_SMTP_PASSWORD_KEY,
  NOTIFICATION_SMTP_PORT_KEY,
  NOTIFICATION_SMTP_SECURE_KEY,
  NOTIFICATION_SMTP_USER_KEY,
  NOTIFICATION_TWILIO_ACCOUNT_SID_KEY,
  NOTIFICATION_TWILIO_AUTH_TOKEN_KEY,
  NOTIFICATION_TWILIO_FROM_NUMBER_KEY,
  NOTIFICATION_FIREBASE_SERVICE_ACCOUNT_JSON_KEY,
  USER_META_PHONE_NUMBER_KEY,
  USER_META_PUSH_TOKEN_KEY,
} from '../../common/constants';

const safeImport = async (moduleName: string): Promise<any | null> => {
  try {
    return await import(moduleName);
  } catch (error) {
    return null;
  }
};

/**
 * EmailNotificationSender
 *
 * Sends notifications via SMTP.
 */
@Injectable()
export class EmailNotificationSender {
  private transporter: any | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  /**
   * Sends an email notification.
   * @param notification - Notification to send.
   * @returns Result of send attempt.
   */
  async send(notification: NotificationEntity): Promise<NotificationSendResult> {
    try {
      const smtpHost = this.configService.get<string>(
        NOTIFICATION_SMTP_HOST_KEY,
      );
      const smtpPort = Number(
        this.configService.get<string>(NOTIFICATION_SMTP_PORT_KEY),
      );
      const smtpUser = this.configService.get<string>(
        NOTIFICATION_SMTP_USER_KEY,
      );
      const smtpPassword = this.configService.get<string>(
        NOTIFICATION_SMTP_PASSWORD_KEY,
      );
      const smtpSecure =
        this.configService.get<string>(NOTIFICATION_SMTP_SECURE_KEY) === 'true';
      const fromName =
        this.configService.get<string>(NOTIFICATION_SMTP_FROM_NAME_KEY) ??
        'Notifications';
      const fromEmail = this.configService.get<string>(
        NOTIFICATION_SMTP_FROM_EMAIL_KEY,
      );

      if (!smtpHost || !smtpPort || !fromEmail) {
        return {
          status: 'failed',
          response:
            'SMTP configuration missing. Provide host, port, and from email.',
        };
      }

      if (!this.transporter) {
        const nodemailer = await safeImport('nodemailer');
        if (!nodemailer) {
          return {
            status: 'failed',
            response: 'Missing dependency: nodemailer',
          };
        }

        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth:
            smtpUser && smtpPassword
              ? { user: smtpUser, pass: smtpPassword }
              : undefined,
        });
      }

      const user = await this.userService.findOne(
        notification.userId,
        notification.userId,
      );

      const info = await this.transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: user.email,
        subject: notification.subject ?? 'Notification',
        text: notification.message,
        html: notification.message,
      });

      return {
        status: 'sent',
        response: info.messageId ?? 'Email sent',
      };
    } catch (error) {
      return {
        status: 'failed',
        response: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }
}

/**
 * SmsNotificationSender
 *
 * Sends notifications via Twilio SMS.
 */
@Injectable()
export class SmsNotificationSender {
  constructor(
    private readonly configService: ConfigService,
    private readonly userMetaService: UserMetaService,
  ) {}

  /**
   * Sends an SMS notification.
   * @param notification - Notification to send.
   * @returns Result of send attempt.
   */
  async send(notification: NotificationEntity): Promise<NotificationSendResult> {
    try {
      const accountSid = this.configService.get<string>(
        NOTIFICATION_TWILIO_ACCOUNT_SID_KEY,
      );
      const authToken = this.configService.get<string>(
        NOTIFICATION_TWILIO_AUTH_TOKEN_KEY,
      );
      const fromNumber = this.configService.get<string>(
        NOTIFICATION_TWILIO_FROM_NUMBER_KEY,
      );

      if (!accountSid || !authToken || !fromNumber) {
        return {
          status: 'failed',
          response:
            'Twilio configuration missing. Provide account SID, auth token, and from number.',
        };
      }

      const phoneMetaKey =
        this.configService.get<string>(USER_META_PHONE_NUMBER_KEY) ??
        'phone_number';

      let toNumber: string | null = null;

      // TODO: Uncomment this when the user meta service is implemented
      /*try {
        toNumber = await this.userMetaService.findMetaValueByUserIdAndMetaKey(
          notification.userId,
          notification.userId,
          phoneMetaKey,
        );
      } catch (error) {
        return {
          status: 'failed',
          response: `User phone number missing for meta key "${phoneMetaKey}".`,
        };
      }*/
      // TODO: Uncomment this when the user meta service is implemented
        toNumber = '+34610981912';

      if (!toNumber) {
        return { status: 'failed', response: 'User phone number missing.' };
      }

      const twilioModule = await safeImport('twilio');
      if (!twilioModule) {
        return { status: 'failed', response: 'Missing dependency: twilio' };
      }

      const client = new twilioModule.Twilio(accountSid, authToken);
      const result = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: notification.message,
      });

      return {
        status: 'sent',
        response: result.sid,
      };
    } catch (error) {
      return {
        status: 'failed',
        response: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }
}

/**
 * PushNotificationSender
 *
 * Sends notifications via Firebase Cloud Messaging.
 */
@Injectable()
export class PushNotificationSender {
  constructor(
    private readonly configService: ConfigService,
    private readonly userMetaService: UserMetaService,
  ) {}

  /**
   * Sends a push notification.
   * @param notification - Notification to send.
   * @returns Result of send attempt.
   */
  async send(notification: NotificationEntity): Promise<NotificationSendResult> {
    try {
      const serviceAccountJson = this.configService.get<string>(
        NOTIFICATION_FIREBASE_SERVICE_ACCOUNT_JSON_KEY,
      );

      if (!serviceAccountJson) {
        return {
          status: 'failed',
          response:
            'Firebase configuration missing. Provide service account JSON.',
        };
      }

      const pushMetaKey =
        this.configService.get<string>(USER_META_PUSH_TOKEN_KEY) ??
        'push_token';

      let pushToken: string | null = null;
      try {
        pushToken = await this.userMetaService.findMetaValueByUserIdAndMetaKey(
          notification.userId,
          notification.userId,
          pushMetaKey,
        );
      } catch (error) {
        return {
          status: 'failed',
          response: `User push token missing for meta key "${pushMetaKey}".`,
        };
      }

      if (!pushToken) {
        return { status: 'failed', response: 'User push token missing.' };
      }

      const appModule = await safeImport('firebase-admin/app');
      const messagingModule = await safeImport('firebase-admin/messaging');

      if (!appModule || !messagingModule) {
        return {
          status: 'failed',
          response: 'Missing dependency: firebase-admin',
        };
      }

      const credentials = this.parseServiceAccount(serviceAccountJson);
      if (!appModule.getApps().length) {
        appModule.initializeApp({
          credential: appModule.cert(credentials),
        });
      }

      const response = await messagingModule.getMessaging().send({
        token: pushToken,
        notification: {
          title: notification.subject ?? 'Notification',
          body: notification.message,
        },
        data: {
          notificationId: String(notification.notificationId),
          eventId: notification.eventId ? String(notification.eventId) : '',
        },
      });

      return {
        status: 'sent',
        response,
      };
    } catch (error) {
      return {
        status: 'failed',
        response: error instanceof Error ? error.message : 'Push send failed',
      };
    }
  }

  /**
   * Parses Firebase service account JSON or base64 string.
   * @param serviceAccount - Raw JSON or base64-encoded JSON.
   * @returns Parsed service account credentials.
   */
  private parseServiceAccount(serviceAccount: string): Record<string, any> {
    const trimmed = serviceAccount.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }

    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

}

/**
 * SystemNotificationSender
 *
 * Handles in-app/system notifications.
 */
@Injectable()
export class SystemNotificationSender {
  /**
   * Marks a system notification as sent.
   * @param notification - Notification to send.
   * @returns Result of send attempt.
   */
  async send(notification: NotificationEntity): Promise<NotificationSendResult> {
    return {
      status: 'sent',
      response: `Created system notification ${notification.notificationId}`,
    };
  }
}
