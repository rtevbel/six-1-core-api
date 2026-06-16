import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from './create-event.dto';

describe('CreateEventDto', () => {
  const base = {
    name: 'six1-event.project_created',
    createdBy: 1,
  };

  it('accepts minimal required fields', async () => {
    const dto = plainToInstance(CreateEventDto, base);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts catalog metadata fields', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...base,
      category: 'domain',
      schemaVersion: '1.0',
      payloadSchema: {
        type: 'object',
        properties: { projectId: { type: 'number' } },
      },
      isSystem: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects unknown category values', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...base,
      category: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });

  it('rejects non-object payloadSchema', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...base,
      payloadSchema: 'not-json-schema',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'payloadSchema')).toBe(true);
  });
});
