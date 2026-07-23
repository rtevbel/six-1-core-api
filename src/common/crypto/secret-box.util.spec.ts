import {
  decryptSecretBox,
  encryptSecretBox,
  parseSecretBoxKey,
} from './secret-box.util';

describe('secret-box.util', () => {
  const key = parseSecretBoxKey(
    Buffer.alloc(32, 7).toString('base64'),
  );

  it('encrypts and decrypts round-trip', () => {
    const payload = encryptSecretBox('smtp-secret-value', key);
    expect(payload.v).toBe(1);
    expect(payload.iv).toBeTruthy();
    expect(payload.tag).toBeTruthy();
    expect(payload.ciphertext).toBeTruthy();
    expect(decryptSecretBox(payload, key)).toBe('smtp-secret-value');
  });

  it('rejects wrong key length', () => {
    expect(() => parseSecretBoxKey(Buffer.alloc(16).toString('base64'))).toThrow(
      /32 bytes/,
    );
  });

  it('accepts hex keys', () => {
    const hex = Buffer.alloc(32, 9).toString('hex');
    const k = parseSecretBoxKey(hex);
    expect(k.length).toBe(32);
  });
});
