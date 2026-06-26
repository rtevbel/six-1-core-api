import {
  readVerificationObjectTypeForUrl,
  readVerificationTokenForUrl,
} from '../notification-verification-url.util';

describe('notification-verification-url.util', () => {
  it('reads token from payload and entity fields', () => {
    expect(
      readVerificationTokenForUrl(
        { verification_token: 'tok-a' },
        { verification_token: 'tok-b' },
      ),
    ).toBe('tok-a');
    expect(
      readVerificationTokenForUrl({}, { verification_token: 'tok-b' }),
    ).toBe('tok-b');
  });

  it('reads object type from workflow and entity namespaces', () => {
    expect(
      readVerificationObjectTypeForUrl(
        {},
        {
          workflow: { subjectType: 'customer', subjectId: 1, context: {} },
          entity: { objectType: null } as any,
        },
        null,
      ),
    ).toBe('customer');
  });
});
