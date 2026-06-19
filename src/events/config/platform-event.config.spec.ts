import {
  loadPlatformEventFlags,
  parsePlatformEventEnvelopeValidationMode,
} from './platform-event.config';
import { ConfigService } from '@nestjs/config';

describe('platform-event.config', () => {
  it('defaults to off when unset', () => {
    expect(parsePlatformEventEnvelopeValidationMode(undefined)).toBe('off');
  });

  it('parses warn and strict modes', () => {
    expect(parsePlatformEventEnvelopeValidationMode('warn')).toBe('warn');
    expect(parsePlatformEventEnvelopeValidationMode('STRICT')).toBe('strict');
  });

  it('falls back to off for unknown values', () => {
    expect(parsePlatformEventEnvelopeValidationMode('maybe')).toBe('off');
  });

  it('loads event bus flag from config', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_EVENT_BUS_ENABLED') {
          return 'true';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(loadPlatformEventFlags(config).eventBusEnabled).toBe(true);
  });

  it('loads notification rules flag from config', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED') {
          return 'true';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(loadPlatformEventFlags(config).notificationRulesEnabled).toBe(true);
  });

  it('loads action executor flag from config', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_ACTION_EXECUTOR_ENABLED') {
          return 'true';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(loadPlatformEventFlags(config).actionExecutorEnabled).toBe(true);
  });

  it('loads event listeners write disabled flag from config', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_EVENT_LISTENERS_WRITE_DISABLED') {
          return 'true';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(loadPlatformEventFlags(config).eventListenersWriteDisabled).toBe(true);
  });
});
