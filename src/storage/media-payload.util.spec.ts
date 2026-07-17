import {
  collectMediaPathsFromValue,
  normalizeAttachmentFieldsInPayload,
} from './media-payload.util';
import { normalizeMediaRef } from '../config_objects/field-validation';

describe('media-payload.util', () => {
  it('collects paths from nested MediaRefs and arrays', () => {
    const paths = collectMediaPathsFromValue({
      evidence: { path: 'tenant/1/x/uploads/a.pdf' },
      files: [
        { key: 'tenant/1/x/uploads/b.pdf' },
        { path: 'tenant/1/x/uploads/c.pdf' },
      ],
      nested: { deep: { path: 'user/2/y/uploads/d.png' } },
      ignore: 'plain',
    });
    expect(paths.sort()).toEqual([
      'tenant/1/x/uploads/a.pdf',
      'tenant/1/x/uploads/b.pdf',
      'tenant/1/x/uploads/c.pdf',
      'user/2/y/uploads/d.png',
    ]);
  });

  it('normalizes attachment fields via registry', () => {
    const result = normalizeAttachmentFieldsInPayload(
      {
        title: 'hello',
        evidence: { key: 'tenant/1/x/uploads/a.pdf', mimeType: 'application/pdf' },
      },
      [
        { fieldKey: 'title', fieldType: 'text' },
        { fieldKey: 'evidence', fieldType: 'attachment', mediaConstraints: { maxFiles: 1 } },
      ],
      (value, maxFiles) => {
        if (Array.isArray(value) && value.length > (maxFiles ?? 1)) {
          return { ok: false, message: 'too many' };
        }
        const ref = normalizeMediaRef(Array.isArray(value) ? value[0] : value);
        if (!ref) {
          return { ok: false, message: 'bad' };
        }
        return { ok: true, value: ref };
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.title).toBe('hello');
      expect(result.payload.evidence).toEqual({
        path: 'tenant/1/x/uploads/a.pdf',
        contentType: 'application/pdf',
      });
    }
  });
});
