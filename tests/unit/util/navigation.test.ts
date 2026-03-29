jest.mock('electron', () => ({
  ipcMain: { on: jest.fn() },
  shell: { openExternal: jest.fn() },
  nativeImage: { createFromPath: jest.fn() }
}));

import { isInternalUrl } from '../../../src/util/navigation';

describe('isInternalUrl', () => {
  describe('about:blank', () => {
    it('allows exact match', () => {
      expect(isInternalUrl('about:blank')).toBe(true);
    });

    it('rejects about:blank with a hash (fullMatch)', () => {
      expect(isInternalUrl('about:blank#hash')).toBe(false);
    });
  });

  describe('messenger URLs', () => {
    it('allows the base messenger URL', () => {
      expect(isInternalUrl('https://www.facebook.com/messages')).toBe(true);
    });

    it('allows messenger subpaths', () => {
      expect(isInternalUrl('https://www.facebook.com/messages/t/123456789')).toBe(true);
    });

    it('allows the base groupcall URL', () => {
      expect(isInternalUrl('https://www.facebook.com/groupcall')).toBe(true);
    });

    it('allows groupcall subpaths', () => {
      expect(isInternalUrl('https://www.facebook.com/groupcall/abc')).toBe(true);
    });
  });

  describe('external URLs', () => {
    it('rejects the facebook root', () => {
      expect(isInternalUrl('https://www.facebook.com/')).toBe(false);
    });

    it('rejects other facebook pages', () => {
      expect(isInternalUrl('https://www.facebook.com/marketplace')).toBe(false);
    });

    it('rejects l.facebook.com redirect shim', () => {
      expect(isInternalUrl('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com')).toBe(false);
    });

    it('rejects unrelated domains', () => {
      expect(isInternalUrl('https://google.com')).toBe(false);
    });
  });
});
