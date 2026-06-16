import { NotificationTemplateValidationService } from './notification-template-validation.service';
import { NotificationVariableCatalogService } from './notification-variable-catalog.service';

describe('NotificationTemplateValidationService', () => {
  const catalogService = {
    buildCatalog: jest.fn(),
  } as unknown as jest.Mocked<NotificationVariableCatalogService>;

  const service = new NotificationTemplateValidationService(catalogService);

  beforeEach(() => {
    catalogService.buildCatalog.mockReset();
  });

  it('flags paths that are not in the catalog or dynamic prefixes', async () => {
    catalogService.buildCatalog.mockResolvedValue({
      eventName: null,
      objectType: null,
      processTemplateId: null,
      entries: [
        {
          key: 'recipient.email',
          label: 'Recipient email',
          path: 'recipient.email',
          type: 'string',
          group: 'Recipient',
        },
      ],
      grouped: {} as any,
    });

    const result = await service.validateTemplates(
      'Hello',
      '{{recipient.email}} {{totally.unknown}} {{entity.fields.name}}',
      { tenantId: 1 },
    );

    expect(result.referencedPaths).toEqual([
      'entity.fields.name',
      'recipient.email',
      'totally.unknown',
    ]);
    expect(result.unknownPaths).toEqual(['totally.unknown']);
  });
});
