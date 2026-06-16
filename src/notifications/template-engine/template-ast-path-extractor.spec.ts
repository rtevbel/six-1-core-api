import {
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

  it('deduplicates paths across subject and message templates', () => {
    expect(
      extractTemplatePathsFromMany([
        '{{recipient.email}}',
        '{{recipient.email}} {{urls.processRunner}}',
      ]),
    ).toEqual(['recipient.email', 'urls.processRunner']);
  });
});
