jest.mock('electron', () => ({
  app: { getVersion: jest.fn() },
  net: { fetch: jest.fn() },
  Notification: jest.fn(),
  shell: { openExternal: jest.fn() }
}));
jest.mock('../../../src/util/logging', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));
jest.mock('../../../src/util/constants', () => ({
  UPDATE_CHECK_DELAY_MS: 0,
  PLATFORM: 'linux',
  GITHUB_RELEASES_API_URL: '',
  GITHUB_RELEASES_URL: ''
}));

import { isNewerVersion, parseVersion } from '../../../src/util/updater';

describe('parseVersion', () => {
  it('parses a plain version string', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
  });

  it('strips a leading v prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
  });

  it('handles zeros', () => {
    expect(parseVersion('0.5.0')).toEqual([0, 5, 0]);
  });
});

describe('isNewerVersion', () => {
  it('returns false for equal versions', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });

  it('detects a newer patch version', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
  });

  it('returns false for an older patch version', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
  });

  it('detects a newer minor version, even with a smaller patch', () => {
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
  });

  it('returns false for an older minor version', () => {
    expect(isNewerVersion('1.0.9', '1.1.0')).toBe(false);
  });

  it('detects a newer major version, even with smaller minor and patch', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
  });

  it('returns false for an older major version', () => {
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(false);
  });

  it('handles a v prefix on both sides', () => {
    expect(isNewerVersion('v1.0.1', 'v1.0.0')).toBe(true);
  });
});
