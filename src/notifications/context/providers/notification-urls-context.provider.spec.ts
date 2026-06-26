import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_PUBLIC_BASE_URL_KEY } from '../../../common/constants';
import { NotificationUrlsContextProvider } from './notification-urls-context.provider';
import { createEmptyNotificationContext } from '../notification-context.types';

describe('NotificationUrlsContextProvider', () => {
  let provider: NotificationUrlsContextProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationUrlsContextProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === NOTIFICATION_PUBLIC_BASE_URL_KEY
                ? 'https://app.example.com'
                : null,
            ),
          },
        },
      ],
    }).compile();

    provider = module.get(NotificationUrlsContextProvider);
  });

  it('hydrates urls.verification from payload token and workflow subject type', () => {
    const context = createEmptyNotificationContext();
    context.workflow.subjectType = 'customer';

    provider.applyVerificationUrl(context, {
      payload: { verification_token: 'tok-1' },
      entityType: null,
      entityId: null,
      tenantId: 5,
      recipientUserId: 1,
      eventName: 'six1-event.process_step_ready',
      occurredAt: null,
      correlationId: null,
      causationId: null,
      actorUserId: null,
    });

    expect(context.urls.verification).toBe(
      'https://app.example.com/verify-customer?token=tok-1',
    );
  });

  it('hydrates urls.verification from entity.fields after config object hydration', () => {
    const context = createEmptyNotificationContext();
    context.entity.objectType = 'customer';
    context.entity.fields = { verification_token: 'tok-entity' };

    provider.applyVerificationUrl(context, {
      payload: {},
      entityType: 'customer',
      entityId: 42,
      tenantId: 5,
      recipientUserId: 1,
      eventName: 'six1-event.process_step_ready',
      occurredAt: null,
      correlationId: null,
      causationId: null,
      actorUserId: null,
    });

    expect(context.urls.verification).toBe(
      'https://app.example.com/verify-customer?token=tok-entity',
    );
  });
});
