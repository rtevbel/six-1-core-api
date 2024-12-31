import { UserLoginTokenEntity } from '../entities/user-login-token.entity';

/**
 * Result interface.
 *
 * Version:1.0.0.
 *
 * This interface is used as return type
 * in findall users method.
 */
export interface FindAllResultInterface {
  tokens: UserLoginTokenEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
