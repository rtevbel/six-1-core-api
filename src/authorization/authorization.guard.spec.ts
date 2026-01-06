import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationService } from './authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let reflector: Reflector;
  let authorizationService: AuthorizationService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthorizationService = {
    hasPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
      ],
    }).compile();

    guard = module.get<AuthorizationGuard>(AuthorizationGuard);
    reflector = module.get<Reflector>(Reflector);
    authorizationService = module.get<AuthorizationService>(AuthorizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).not.toHaveBeenCalled();
    });

    it('should allow access when permissions array is empty', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).not.toHaveBeenCalled();
    });

    it('should allow access when user has required permissions', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.create']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        1,
        ['projects.create'],
        undefined,
      );
    });

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.create']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(false);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalled();
    });

    it('should extract userId from HTTP request.user', async () => {
      const mockContext = createMockExecutionContext('http', {
        user: { userId: 123 },
      });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        123,
        ['projects.read'],
        undefined,
      );
    });

    it('should extract userId from HTTP request.body', async () => {
      const mockContext = createMockExecutionContext('http', {
        body: { userId: 456 },
      });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        456,
        ['projects.read'],
        undefined,
      );
    });

    it('should extract userId from RPC data', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 789 });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        789,
        ['projects.read'],
        undefined,
      );
    });

    it('should extract userId from RPC data.user_id (snake_case)', async () => {
      const mockContext = createMockExecutionContext('rpc', { user_id: 999 });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        999,
        ['projects.read'],
        undefined,
      );
    });

    it('should extract tenantUserId when provided', async () => {
      const mockContext = createMockExecutionContext('rpc', {
        userId: 1,
        tenantUserId: 10,
      });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        1,
        ['projects.read'],
        10,
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      const mockContext = createMockExecutionContext('rpc', {});
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for unsupported context type', async () => {
      const mockContext = createMockExecutionContext('graphql', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle string userId and convert to number', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: '123' });
      mockReflector.getAllAndOverride.mockReturnValue(['projects.read']);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        123,
        ['projects.read'],
        undefined,
      );
    });

    it('should handle multiple required permissions', async () => {
      const mockContext = createMockExecutionContext('rpc', { userId: 1 });
      mockReflector.getAllAndOverride.mockReturnValue([
        'projects.create',
        'tasks.read',
      ]);
      mockAuthorizationService.hasPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasPermissions).toHaveBeenCalledWith(
        1,
        ['projects.create', 'tasks.read'],
        undefined,
      );
    });
  });

  function createMockExecutionContext(
    type: 'http' | 'rpc' | string,
    data: any,
  ): ExecutionContext {
    const mockContext = {
      getType: jest.fn().mockReturnValue(type),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: data.user,
          body: data.body,
        }),
      }),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn().mockReturnValue(data),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    return mockContext;
  }
});

