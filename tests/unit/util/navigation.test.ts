jest.mock('electron', () => ({
  app: { commandLine: { hasSwitch: () => false } },
  ipcMain: { on: jest.fn() },
  shell: { openExternal: jest.fn() },
  nativeImage: { createFromPath: jest.fn() }
}));

import vm from 'vm';
import { BrowserWindow } from 'electron';
import { ALLOWED_DOMAINS, MESSENGER_URL } from '../../../src/util/constants';
import { isInternalUrl, setupNavigationGuard } from '../../../src/util/navigation';

const DOMAINS = ['www.facebook.com', 'www.messenger.com'];
const INTERNAL_PATHS = [
  'groupcall',
  'login',
  'two_step_verification',
  'two_factor',
  'checkpoint',
  'privacy/consent',
  'messenger_media'
];

describe('ALLOWED_DOMAINS', () => {
  it('contains both facebook.com and messenger.com', () => {
    expect(ALLOWED_DOMAINS).toEqual(expect.arrayContaining(DOMAINS));
  });
});

describe('isInternalUrl', () => {
  it('rejects undefined', () => {
    expect(isInternalUrl(undefined)).toBe(false);
  });

  describe('about:blank', () => {
    it('allows exact match', () => {
      expect(isInternalUrl('about:blank')).toBe(true);
    });

    it('rejects about:blank with a hash (exact match only)', () => {
      expect(isInternalUrl('about:blank#hash')).toBe(false);
    });
  });

  describe('MESSENGER_URL', () => {
    it('allows the base messenger URL', () => {
      expect(isInternalUrl(MESSENGER_URL)).toBe(true);
    });

    it('allows messenger subpaths', () => {
      expect(isInternalUrl(`${MESSENGER_URL}/t/123456789`)).toBe(true);
    });

    it('rejects a lookalike host that starts with the messenger URL', () => {
      expect(isInternalUrl(`${MESSENGER_URL}.evil.com`)).toBe(false);
    });
  });

  describe.each(DOMAINS)('allowed paths on %s', (domain) => {
    it.each(INTERNAL_PATHS)('allows /%s', (path) => {
      expect(isInternalUrl(`https://${domain}/${path}`)).toBe(true);
    });

    it.each(INTERNAL_PATHS)('allows /%s subpaths', (path) => {
      expect(isInternalUrl(`https://${domain}/${path}/abc?x=1`)).toBe(true);
    });

    it('allows path prefixes like login.php', () => {
      expect(isInternalUrl(`https://${domain}/login.php`)).toBe(true);
    });

    it('rejects lookalike hosts', () => {
      expect(isInternalUrl(`https://${domain}.evil.com/login`)).toBe(false);
    });

    it('rejects plain http', () => {
      expect(isInternalUrl(`http://${domain}/login`)).toBe(false);
    });
  });

  describe('special schemes', () => {
    it.each([
      'blob:https://www.messenger.com/abc',
      'data:text/plain,hi',
      'javascript:void(0)',
      'ws://host',
      'wss://host'
    ])('allows %s', (url) => {
      expect(isInternalUrl(url)).toBe(true);
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

// Runs the script injected on dom-ready against a fake DOM, to verify the patterns survive serialization.
describe('navigation guard script', () => {
  function loadGuard(): { click: (href: string) => { blocked: boolean } } {
    const handlers: Record<string, () => void> = {};
    let script = '';
    const browserWindow = {
      webContents: {
        on: (event: string, handler: () => void) => {
          handlers[event] = handler;
        },
        executeJavaScript: (code: string) => {
          script = code;
          return Promise.resolve();
        }
      }
    } as unknown as BrowserWindow;

    setupNavigationGuard(browserWindow, true);
    handlers['dom-ready']();

    let clickListener: (event: any) => void = () => undefined;
    const fakeDocument = {
      addEventListener: (_type: string, listener: (event: any) => void) => {
        clickListener = listener;
      }
    };
    const fakeWindow = { electronAPI: { openExternal: jest.fn() } };
    vm.runInNewContext(script, {
      URL,
      document: fakeDocument,
      window: fakeWindow,
      location: { href: `${MESSENGER_URL}/` }
    });

    return {
      click: (href: string) => {
        const event = {
          target: { closest: () => ({ href }) },
          preventDefault: jest.fn(),
          stopImmediatePropagation: jest.fn()
        };
        clickListener(event);
        return { blocked: event.preventDefault.mock.calls.length > 0 };
      }
    };
  }

  it('lets MESSENGER_URL links through', () => {
    expect(loadGuard().click(`${MESSENGER_URL}/t/123`).blocked).toBe(false);
  });

  describe.each(DOMAINS)('on %s', (domain) => {
    it.each(INTERNAL_PATHS)('lets /%s links through', (path) => {
      expect(loadGuard().click(`https://${domain}/${path}`).blocked).toBe(false);
    });
  });

  it('blocks external links', () => {
    expect(loadGuard().click('https://google.com').blocked).toBe(true);
  });

  it('blocks non-allowlisted facebook pages', () => {
    expect(loadGuard().click('https://www.facebook.com/marketplace').blocked).toBe(true);
  });
});
