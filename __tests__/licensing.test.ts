import {
  __resetProCacheForTests,
  __setLicenseSecretForTests,
  activateLicense,
  deactivateLicense,
  generateLicenseKey,
  isPro,
  licenseSummary,
  refreshProStatus,
} from '../src/services/licensing';
import {
  FREE_RECORD_LIMIT,
  applyRecordLimit,
  canFetchPrices,
  canUseAbcDividers,
  canUseManualOrder,
  upgradeMessage,
} from '../src/services/featureGate';

const TEST_SECRET = 'jest-spindle-license-secret';

describe('licensing', () => {
  beforeEach(async () => {
    __setLicenseSecretForTests(TEST_SECRET);
    __resetProCacheForTests();
    await deactivateLicense();
  });

  afterEach(async () => {
    await deactivateLicense();
    __setLicenseSecretForTests(undefined);
    __resetProCacheForTests();
  });

  it('generates and activates a VSS1 key', async () => {
    const key = generateLicenseKey('tester@example.com', 'pro', 1);
    expect(key.startsWith('VSS1-')).toBe(true);
    expect(key.includes('.')).toBe(true);

    const result = await activateLicense(key);
    expect(result.ok).toBe(true);
    expect(await isPro()).toBe(true);
    expect(await licenseSummary()).toMatch(/Pro/);
  });

  it('rejects invalid keys', async () => {
    const result = await activateLicense('VSS1-notavalidkey.sig');
    expect(result.ok).toBe(false);
    expect(await isPro()).toBe(false);
  });

  it('rejects keys signed with a different secret', async () => {
    const key = generateLicenseKey('a@b.c');
    __setLicenseSecretForTests('other-secret');
    __resetProCacheForTests();
    const result = await activateLicense(key);
    expect(result.ok).toBe(false);
  });

  it('deactivates Pro', async () => {
    const key = generateLicenseKey();
    await activateLicense(key);
    expect(await isPro()).toBe(true);
    await deactivateLicense();
    expect(await refreshProStatus()).toBe(false);
  });

  it('fails closed when secret is empty', () => {
    __setLicenseSecretForTests(null);
    expect(() => generateLicenseKey()).toThrow(/VSS_LICENSE_SECRET/);
  });
});

describe('featureGate', () => {
  it('applies free record limit', () => {
    const rows = Array.from({ length: 150 }, (_, i) => i);
    const free = applyRecordLimit(rows, false);
    expect(free.truncated).toBe(true);
    expect(free.rows).toHaveLength(FREE_RECORD_LIMIT);

    const pro = applyRecordLimit(rows, true);
    expect(pro.truncated).toBe(false);
    expect(pro.rows).toHaveLength(150);
  });

  it('gates Pro features', () => {
    expect(canFetchPrices(false)).toBe(false);
    expect(canFetchPrices(true)).toBe(true);
    expect(canUseManualOrder(false)).toBe(false);
    expect(canUseAbcDividers(false)).toBe(false);
    expect(canUseAbcDividers(true)).toBe(true);
  });

  it('builds upgrade copy', () => {
    expect(upgradeMessage('Manual shelf order')).toContain('Pro');
  });
});
