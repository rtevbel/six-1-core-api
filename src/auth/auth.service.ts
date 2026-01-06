import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { OidcClient } from './oidc-client';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import {
  hash_content,
  compare_hashed_content,
  ensureDefinedConfigParam,
} from '../common/functions';

import {
  JWT_REFRESH_TOKEN_SECRET_KEY,
  JWT_REFRESH_TOKEN_EXPIRATION_TIME,
  EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE,
  REDIS_USER_REFRESH_TOKEN_IDENTIFIER,
  MESSAGE_BROKER_AUTH_TOKEN,
} from './constants';
import { UserJWTTokenResponseInterface } from './interfaces/user-jwt-token-response.interface';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UserService } from 'src/users/users.service';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUserRoleEntity } from '../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { TenantUsersEntity } from '../tenants/tenant_users/entities/tenant_user.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { RoleDescriptionEntity } from '../roles/entities/role-description.entity';
import { PermissionDescriptionEntity } from '../permissions/entities/permission_description.entity';
import { AuthorizationService } from '../authorization/authorization.service';

/**
 * Auth service class.
 *
 * Version:1.0.0.
 *
 * This service class handles users' authentication,
 * by using passwort package.
 *
 */
@Injectable()
export class AuthService {
  /**
   * Payload object will be used to pass data to remote service,
   * using RMQ message broker.
   *
   * Version: 1.0.0
   */
  payload = {
    userId: 0,
    action: '',
    data: {},
  };

  /**
   * Initializes AuthService class.
   *
   * Version:1.0.0.
   *
   * @param {ClientProxy} client  -ClientProxy class.
   * @param {JwtService} jwtService -JwtService class.
   * @param {OidcClient} oidcClient -OidcClient class.
   * @param {ConfigService} configService  -ConfigService class.
   * @param {Redis} redisClient - redisClient class.
   */
  constructor(
    private readonly UserService: UserService,
    @Inject(MESSAGE_BROKER_AUTH_TOKEN)
    private readonly client: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly oidcClient: OidcClient,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redisClient: Redis,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(RoleDescriptionEntity)
    private readonly roleDescriptionRepository: Repository<RoleDescriptionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Validates User.
   *
   * Version:1.0.0.
   *
   * This service method communicates with users,
   * service to validate user.
   *
   * @param {string} password -User password.
   * @param {string} username -User username.
   * @param {string} email -User email address.
   * @returns {Promise<object|null>} -Promise that resolves to either,
   * a UserEntity object or a null.
   */
  async validateUser(
    password: string,
    username?: string,
    email?: string,
  ): Promise<object | null> {
    // Prioritize email if provided, otherwise use username
    const params = email
      ? { email: email, status: 1 }
      : username
        ? { username: username, status: 1 }
        : {};

    // If neither email nor username is provided, return null
    if (!email && !username) {
      return null;
    }

    const userId = 0;
    const userObject = await this.UserService.findOneBy(userId, params);

    if (
      userObject &&
      (await compare_hashed_content(userObject.password, password))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...user } = userObject;
      return user;
    }
    return null;
  }

  /**
   * Returns user jwt token
   *
   * Version:1.0.0.
   *
   * @param {any} user -User object.
   * @returns {Promise<UserJWTTokenResponseInterface>} -Promise that resolves to access_token object.
   */
  async googleLogin(user: any): Promise<UserJWTTokenResponseInterface> {
    // Create a signed JWT token to return to the client
    const payload = {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Creates authenticated user's jwt_token.
   *
   * @Version 0.0.1
   *
   * This method generates and returns  user's JWT token from user's,
   * entity and saves refresh token into redis database.
   *
   * @param {any} user -UserEntity.
   * @returns {Promise<UserJWTTokenResponseInterface>} -Promise that resolves to user access,
   * and refresh JWT tokens.
   */
  async login(user: any): Promise<UserJWTTokenResponseInterface> {
    const payload = { username: user.username, userId: user.userId };
    const response = {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
        expiresIn: this.configService.get<string>(
          JWT_REFRESH_TOKEN_EXPIRATION_TIME,
        ),
      }),
    };

    // Store refresh_token in redis database to handle it's expiry and removal
    const expiresIn =
      (this.configService.get<string>(JWT_REFRESH_TOKEN_EXPIRATION_TIME)
        ? parseInt(
            ensureDefinedConfigParam(
              this.configService.get<string>(JWT_REFRESH_TOKEN_EXPIRATION_TIME),
              JWT_REFRESH_TOKEN_EXPIRATION_TIME,
            ),
          )
        : 7) * 86400; // 7 days in seconds

    const hased_refresh_token = await hash_content(response.refresh_token);
    this.redisClient.set(
      REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll('{user_id}', user.userId),
      hased_refresh_token,
      'EX',
      expiresIn,
    );
    return response;
  }

  /**
   * Returns fresh access token.
   *
   * Version:1.0.0.
   *
   * This method generates and returns new access token by using,
   * user's refresh token.
   *
   * @param {string} refresh_token -Refresh token.
   * @returns {Promise<UserJWTTokenResponseInterface|UnauthorizedException>} -Promise that resolves to,
   * either a UserJWTTokenResponseInterface or a UnauthorizedException.
   */
  async refreshToken(
    refresh_token: string,
  ): Promise<UserJWTTokenResponseInterface | UnauthorizedException> {
    const decoded = await this.jwtService.verifyAsync(refresh_token, {
      secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
    });

    const refreshToken = await this.redisClient.get(
      REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll(
        '{user_id}',
        decoded.userId,
      ),
    );

    if (
      refreshToken === null ||
      (await compare_hashed_content(refreshToken, refresh_token)) === false
    ) {
      throw new UnauthorizedException(EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE);
    }

    const payload = { username: decoded.username, userId: decoded.userId };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Revokes user refresh token.
   *
   * Version:1.0.0.
   *
   * This method revokes refresh token for security,
   * reasons.
   *
   * @param {string} refresh_token -Refresh token.
   * @returns {Promise<boolean|UnauthorizedException>} -Promise that resolves to either boolean,
   * or a UnauthorizedException.
   */
  async revokeRefreshToken(
    refresh_token: string,
  ): Promise<boolean | UnauthorizedException> {
    const decoded = await this.jwtService.verifyAsync(refresh_token, {
      secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
    });

    let isDeleted: number = 0;
    if (decoded.userId) {
      isDeleted = await this.redisClient.del(
        REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll(
          '{user_id}',
          decoded.userId,
        ),
      );
    } else {
      throw new UnauthorizedException(EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE);
    }
    return isDeleted ? true : false;
  }

  /**
   * Returns google authorization url.
   *
   * Version:1.0.0.
   *
   * @param void
   * @returns {Promise<string>} -Promise that resolves to authorizationUrl.
   */
  async getGoogleAuthorizationUrl(): Promise<string> {
    const client = await this.oidcClient.getClient();
    const authorizationUrl = client.authorizationUrl();
    return authorizationUrl;
  }

  /**
   * Returns user profile with roles and permissions.
   *
   * Version:1.0.0.
   *
   * This method retrieves the user's profile including:
   * - User ID
   * - Roles from user_roles and tenant_user_roles tables
   * - Permissions based on assigned roles
   * - Flag indicating if the user is a tenant user
   * - Tenant ID if the user is a tenant user
   *
   * @param userId - ID of the user.
   * @param tenantUserId - Optional tenant user ID for tenant-scoped roles.
   * @returns {Promise<Object>} -Promise that resolves to user profile object.
   */
  async getProfile(
    userId: number,
    tenantUserId?: number,
  ): Promise<{
    userId: number;
    roles: Array<{ id: number; name: string }>;
    permissions: string[];
    isTenantUser: boolean;
    tenantId?: number;
  }> {
    // Get user roles with role names
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role', 'role.descriptions'],
    });

    // Get tenant user roles with role names if tenantUserId is provided
    let tenantUserRoles: TenantUserRoleEntity[] = [];
    if (tenantUserId) {
      tenantUserRoles = await this.tenantUserRoleRepository.find({
        where: { tenantUserId },
        relations: ['role', 'role.descriptions'],
      });
    }

    // Combine all roles and extract unique role information
    const allRoles = [...userRoles, ...tenantUserRoles];
    const roleMap = new Map<number, { id: number; name: string }>();

    for (const userRole of allRoles) {
      const roleId = userRole.roleId;
      if (!roleMap.has(roleId)) {
        // Get role name from role descriptions (default to language_id = 1)
        const roleDescription = await this.roleDescriptionRepository.findOne({
          where: { roleId, languageId: 1 },
        });

        roleMap.set(roleId, {
          id: roleId,
          name: roleDescription?.name || `Role ${roleId}`,
        });
      }
    }

    const roles = Array.from(roleMap.values());

    // Get permissions using AuthorizationService
    // We need to access the private method, so we'll use a workaround
    // or make it public. For now, let's create a query similar to the one in AuthorizationService
    const permissions = await this.getUserPermissions(userId, tenantUserId);

    // Check if the user is a tenant user and get tenant ID
    // If tenantUserId is provided, query by tenantUserId to get tenantId
    // Otherwise, check if there's any tenant_user record for this userId
    let isTenantUser = false;
    let tenantId: number | undefined = undefined;

    if (tenantUserId) {
      console.log('tenantUserId', tenantUserId);
      // If tenantUserId is provided, query by tenantUserId to get tenantId
      const tenantUser = await this.tenantUsersRepository.findOne({
        where: { tenantUserId },
      });
      if (tenantUser) {
        isTenantUser = true;
        tenantId = tenantUser.tenantId;
      }
    } else {
      // Check if there's any tenant record for this userId (user owns a tenant)
      const tenant = await this.tenantRepository.findOne({
        where: { userId },
      });
      if (tenant) {
        isTenantUser = true;
        tenantId = tenant.tenantId;
      }
    }

    return {
      userId,
      roles,
      permissions: Array.from(permissions).sort(),
      isTenantUser,
      tenantId,
    };
  }

  /**
   * Gets user permissions by querying the database.
   * Similar to AuthorizationService.getPermissionSet but as a public method.
   *
   * @param userId - ID of the user.
   * @param tenantUserId - Optional tenant user ID for tenant-scoped permissions.
   * @returns {Promise<Set<string>>} -Promise that resolves to a Set of permission names.
   */
  private async getUserPermissions(
    userId: number,
    tenantUserId?: number,
  ): Promise<Set<string>> {
    // Query permissions similar to AuthorizationService.basePermissionQuery
    const qb = this.permissionDescriptionRepository
      .createQueryBuilder('pd')
      .select('pd.name', 'name')
      .distinct(true)
      .innerJoin(
        'role_permissions',
        'rp',
        'rp.permission_id = pd.permission_id',
      )
      .innerJoin('user_roles', 'ur', 'ur.role_id = rp.role_id')
      .leftJoin('tenant_user_roles', 'tur', 'tur.role_id = rp.role_id')
      .where('pd.language_id = :languageId', { languageId: 1 })
      .andWhere(
        new Brackets((where) => {
          where.where('ur.user_id = :userId', { userId });
          if (tenantUserId) {
            where.orWhere('tur.tenant_user_id = :tenantUserId', {
              tenantUserId,
            });
          }
        }),
      );

    const rows = await qb.getRawMany<{ name: string }>();
    return new Set(rows.map((row) => row.name));
  }
}
