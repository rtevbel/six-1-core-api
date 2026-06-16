import {
  shouldHydrateEntityNamespace,
  shouldHydrateProcessNamespace,
  shouldHydrateWorkflowNamespace,
} from './notification-context-hydration.util';

describe('shouldHydrateEntityNamespace', () => {
  it('returns false when requiredPaths is empty or omitted', () => {
    expect(shouldHydrateEntityNamespace()).toBe(false);
    expect(shouldHydrateEntityNamespace([])).toBe(false);
  });

  it('returns true for entity.fields and entity.relations paths', () => {
    expect(shouldHydrateEntityNamespace(['entity.fields.name'])).toBe(true);
    expect(
      shouldHydrateEntityNamespace(['entity.relations.billing.fields.email']),
    ).toBe(true);
  });

  it('returns false for unrelated namespaces', () => {
    expect(shouldHydrateEntityNamespace(['process.stepName'])).toBe(false);
    expect(shouldHydrateEntityNamespace(['payload.projectId'])).toBe(false);
  });
});

describe('shouldHydrateProcessNamespace', () => {
  it('returns true for process paths', () => {
    expect(shouldHydrateProcessNamespace(['process.stepName'])).toBe(true);
    expect(shouldHydrateProcessNamespace(['urls.processRunner'])).toBe(false);
  });
});

describe('shouldHydrateWorkflowNamespace', () => {
  it('returns true for workflow paths', () => {
    expect(shouldHydrateWorkflowNamespace(['workflow.context.intent'])).toBe(
      true,
    );
  });
});
