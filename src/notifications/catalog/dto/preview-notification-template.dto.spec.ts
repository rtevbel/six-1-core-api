import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { PreviewNotificationTemplateDto } from './preview-notification-template.dto';

describe('PreviewNotificationTemplateDto', () => {
  const pipe = new AppRpcValidationPipe();

  it('accepts envelope as a plain EventEnvelope object', async () => {
    const dto = await pipe.transform(
      {
        message: 'Hello {{payload.projectName}}',
        recipientUserId: 1,
        envelope: {
          eventName: 'six1-event.project_created',
          tenantId: 10,
          userId: 10,
          data: { projectName: 'Demo Project', projectId: 123 },
          entity: {
            entityType: 'project',
            entityId: 123,
            objectType: 'project',
            coreId: 123,
          },
        },
      },
      { type: 'body', metatype: PreviewNotificationTemplateDto },
    );

    expect(dto.envelope).toEqual(
      expect.objectContaining({
        eventName: 'six1-event.project_created',
        data: { projectName: 'Demo Project', projectId: 123 },
      }),
    );
  });
});
