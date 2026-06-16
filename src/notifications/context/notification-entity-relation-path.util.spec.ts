import {
  extractEntityRelationKeys,
  shouldHydrateEntityRelations,
} from './notification-entity-relation-path.util';

describe('notification-entity-relation-path.util', () => {
  describe('extractEntityRelationKeys', () => {
    it('returns unique relationship keys from entity.relations paths', () => {
      expect(
        extractEntityRelationKeys([
          'entity.relations.billingContact.fields.email',
          'entity.relations.billingContact.fields.name',
          'entity.relations.owner.fields.name',
        ]),
      ).toEqual(['billingContact', 'owner']);
    });

    it('ignores nested relation walks beyond graph depth 2', () => {
      expect(
        extractEntityRelationKeys([
          'entity.relations.billingContact.relations.owner.fields.name',
        ]),
      ).toEqual([]);
    });

    it('returns empty when no relation paths are present', () => {
      expect(extractEntityRelationKeys(['entity.fields.name'])).toEqual([]);
    });
  });

  describe('shouldHydrateEntityRelations', () => {
    it('is true when entity.relations paths are referenced', () => {
      expect(
        shouldHydrateEntityRelations(['entity.relations.owner.fields.name']),
      ).toBe(true);
    });

    it('is false when only entity.fields are referenced', () => {
      expect(shouldHydrateEntityRelations(['entity.fields.name'])).toBe(false);
    });
  });
});
