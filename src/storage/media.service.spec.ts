import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';
import { MediaErrorCode } from './media-error-codes';

describe('MediaService', () => {
  let service: MediaService;
  let storage: {
    driver: string;
    presignUpload: jest.Mock;
    head: jest.Mock;
    getPresignedDownloadUrl: jest.Mock;
    remove: jest.Mock;
  };

  const caller = { userId: 1, tenantId: '1' };

  beforeEach(async () => {
    storage = {
      driver: 'local',
      presignUpload: jest.fn().mockResolvedValue({ url: 'https://upload' }),
      head: jest.fn().mockResolvedValue({
        exists: true,
        contentLength: 100,
        contentType: 'application/pdf',
        etag: '"abc"',
        lastModified: null,
        metadata: {},
      }),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://download',
        expiresIn: 300,
        driver: 'local',
      }),
      remove: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: StorageService, useValue: storage },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, fallback?: number) => fallback,
          },
        },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('startUpload returns path and uploadUrl', async () => {
    const result = await service.startUpload({
      filename: 'doc.pdf',
      contentType: 'application/pdf',
      ownership: {
        scope: 'tenant',
        ownerId: '1',
        objectType: 'invoice',
        fieldKey: 'files',
      },
      caller,
    });
    expect(result.uploadUrl).toBe('https://upload');
    expect(result.path).toMatch(/^tenant\/1\/invoice\/files\/.+\.pdf$/);
    expect(result.driver).toBe('local');
  });

  it('startUpload forbids cross-tenant ownership', async () => {
    try {
      await service.startUpload({
        filename: 'doc.pdf',
        ownership: {
          scope: 'tenant',
          ownerId: '99',
          objectType: 'invoice',
        },
        caller,
      });
      fail('expected forbidden');
    } catch (err: unknown) {
      const payload =
        typeof (err as { getError?: () => unknown }).getError === 'function'
          ? (err as { getError: () => unknown }).getError()
          : err;
      expect(payload).toEqual(
        expect.objectContaining({ code: MediaErrorCode.Forbidden }),
      );
    }
  });

  it('confirmUpload returns MediaRef with path', async () => {
    const ref = await service.confirmUpload({
      path: 'tenant/1/invoice/files/abc.pdf',
      filename: 'doc.pdf',
      caller,
    });
    expect(ref.path).toBe('tenant/1/invoice/files/abc.pdf');
    expect(ref.contentType).toBe('application/pdf');
    expect(ref.sizeBytes).toBe(100);
  });

  it('confirmUpload throws NotFound when missing', async () => {
    storage.head.mockResolvedValueOnce({
      exists: false,
      contentLength: null,
      contentType: null,
      etag: null,
      lastModified: null,
      metadata: {},
    });
    try {
      await service.confirmUpload({
        path: 'tenant/1/x/uploads/missing.bin',
        caller,
      });
      fail('expected RpcException');
    } catch (err: unknown) {
      const payload =
        typeof (err as { getError?: () => unknown }).getError === 'function'
          ? (err as { getError: () => unknown }).getError()
          : err;
      expect(payload).toEqual(
        expect.objectContaining({ code: MediaErrorCode.NotFound }),
      );
    }
  });

  it('deletePaths deletes each path', async () => {
    const result = await service.deletePaths({
      paths: ['a/b/c/d/e.pdf', 'tenant/1/x/uploads/f.png'],
      caller,
    });
    expect(result.deleted).toEqual([
      'a/b/c/d/e.pdf',
      'tenant/1/x/uploads/f.png',
    ]);
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });

  it('deleteRemovedPaths only deletes removed', async () => {
    await service.deleteRemovedPaths(
      ['tenant/1/x/uploads/old.pdf', 'tenant/1/x/uploads/keep.pdf'],
      ['tenant/1/x/uploads/keep.pdf'],
    );
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith({
      key: 'tenant/1/x/uploads/old.pdf',
      bucket: undefined,
    });
  });
});
