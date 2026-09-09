import {
  hashLocalPassword,
  normalizeEmail,
  validateLocalAccountForm,
} from '../src/services/localAccount';

describe('local Spindle account', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Jane@Example.COM ')).toBe('jane@example.com');
  });

  it('hashes with salt', () => {
    const a = hashLocalPassword('secret1', 'salt-a');
    const b = hashLocalPassword('secret1', 'salt-a');
    const c = hashLocalPassword('secret1', 'salt-b');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.length).toBeGreaterThan(16);
  });

  it('validates create-account fields', () => {
    expect(
      validateLocalAccountForm({
        name: 'J',
        email: 'a@b.c',
        password: '123456',
        confirm: '123456',
      })
    ).toMatch(/name/i);
    expect(
      validateLocalAccountForm({
        name: 'Jon',
        email: 'not-an-email',
        password: '123456',
        confirm: '123456',
      })
    ).toMatch(/email/i);
    expect(
      validateLocalAccountForm({
        name: 'Jon',
        email: 'jon@example.com',
        password: '123',
        confirm: '123',
      })
    ).toMatch(/password/i);
    expect(
      validateLocalAccountForm({
        name: 'Jon',
        email: 'jon@example.com',
        password: '123456',
        confirm: '654321',
      })
    ).toMatch(/match/i);
    expect(
      validateLocalAccountForm({
        name: 'Jon',
        email: 'jon@example.com',
        password: '123456',
        confirm: '123456',
      })
    ).toBeNull();
  });
});
