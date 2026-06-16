import { Injectable } from '@nestjs/common';
import { UserService } from '../../../users/users.service';
import type { NotificationContext } from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';
import { getNotificationUserDisplayName } from '../notification-user-display.util';

/**
 * Hydrates `actor.*` and `recipient.*` from platform users.
 */
@Injectable()
export class ActorRecipientProvider {
  constructor(private readonly userService: UserService) {}

  async apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
  ): Promise<void> {
    await this.applyUserNamespace(
      context.actor,
      source.actorUserId,
      source.recipientUserId,
    );
    await this.applyUserNamespace(
      context.recipient,
      source.recipientUserId,
      source.recipientUserId,
    );
  }

  private async applyUserNamespace(
    target: NotificationContext['actor'],
    userId: number | null,
    requesterId: number,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    target.id = userId;
    const user = await this.safeFindUser(requesterId, userId);
    if (!user) {
      return;
    }

    target.name = getNotificationUserDisplayName(user);
    target.email = user.email ?? null;
  }

  private async safeFindUser(
    requesterId: number,
    userId: number,
  ): Promise<{
    email?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  } | null> {
    try {
      return await this.userService.findOne(requesterId, userId);
    } catch {
      return null;
    }
  }
}
