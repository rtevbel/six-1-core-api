import {
  extractRequiredTemplatePaths,
  extractRequiredTemplatePathsFromMany,
  extractTemplatePaths,
  extractTemplatePathsFromMany,
} from './template-ast-path-extractor';

describe('template-ast-path-extractor', () => {
  it('extracts dot-paths from mustache expressions', () => {
    expect(
      extractTemplatePaths('Hello {{recipient.name}}, project {{entity.fields.name}}'),
    ).toEqual(['entity.fields.name', 'recipient.name']);
  });

  it('extracts paths from block conditionals and helper params', () => {
    expect(
      extractTemplatePaths(
        '{{#if process.stepName}}Step {{process.stepName}}{{/if}} Due {{formatDate entity.fields.dueDate "short"}}',
      ),
    ).toEqual(['entity.fields.dueDate', 'process.stepName']);
  });

  it('treats paths inside if blocks as optional for validation', () => {
    const template =
      'Hello{{#if entity.fields.companyName}} {{entity.fields.companyName}}{{/if}}, verify {{urls.verification}}{{#if payload.expiryHours}} expires {{payload.expiryHours}}{{/if}}';

    expect(extractTemplatePaths(template)).toEqual([
      'entity.fields.companyName',
      'payload.expiryHours',
      'urls.verification',
    ]);
    expect(extractRequiredTemplatePaths(template)).toEqual(['urls.verification']);
  });

  it('deduplicates paths across subject and message templates', () => {
    expect(
      extractTemplatePathsFromMany([
        '{{recipient.email}}',
        '{{recipient.email}} {{urls.processRunner}}',
      ]),
    ).toEqual(['recipient.email', 'urls.processRunner']);
  });

  it('deduplicates required paths across subject and message templates', () => {
    expect(
      extractRequiredTemplatePathsFromMany([
        '{{#if entity.fields.name}}{{entity.fields.name}}{{/if}}',
        '{{urls.verification}}',
      ]),
    ).toEqual(['urls.verification']);
  });
});
