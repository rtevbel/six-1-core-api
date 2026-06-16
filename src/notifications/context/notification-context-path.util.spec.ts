import {
  collectPathPrefixes,
  collectPathPrefixesFromMany,
  getByPath,
  pathStartsWith,
  setByPath,
} from './notification-context-path.util';
import { createEmptyNotificationContext } from './notification-context.types';

describe('notification-context-path.util', () => {
  describe('getByPath / setByPath', () => {
    it('reads and writes top-level keys', () => {
      const root: Record<string, unknown> = {};
      setByPath(root, 'payload', { projectId: 1 });
      expect(getByPath(root, 'payload')).toEqual({ projectId: 1 });
    });

    it('reads and writes nested keys', () => {
      const root = createEmptyNotificationContext() as unknown as Record<
        string,
        unknown
      >;
      setByPath(root, 'entity.fields.companyName', 'Acme');
      expect(getByPath(root, 'entity.fields.companyName')).toBe('Acme');
      expect(
        (getByPath(root, 'entity') as Record<string, unknown>).fields,
      ).toEqual({ companyName: 'Acme' });
    });

    it('returns undefined for missing paths', () => {
      const root: Record<string, unknown> = {};
      expect(getByPath(root, 'entity.fields.missing')).toBeUndefined();
    });

    it('rejects invalid path segments', () => {
      expect(() => getByPath({}, 'bad.path.')).toThrow();
      expect(() => getByPath({}, '9invalid')).toThrow();
    });
  });

  describe('collectPathPrefixes', () => {
    it('returns all prefixes for a path', () => {
      expect(collectPathPrefixes('entity.fields.name')).toEqual([
        'entity',
        'entity.fields',
        'entity.fields.name',
      ]);
    });

    it('deduplicates across many paths', () => {
      expect(
        collectPathPrefixesFromMany([
          'entity.fields.name',
          'entity.fields.email',
          'process.stepName',
        ]),
      ).toEqual([
        'entity',
        'entity.fields',
        'entity.fields.email',
        'entity.fields.name',
        'process',
        'process.stepName',
      ]);
    });
  });

  describe('pathStartsWith', () => {
    it('matches namespace prefixes', () => {
      expect(pathStartsWith('entity.fields.name', 'entity.fields')).toBe(true);
      expect(pathStartsWith('entity', 'entity.fields')).toBe(false);
      expect(pathStartsWith('payload.projectId', 'payload')).toBe(true);
    });
  });
});
