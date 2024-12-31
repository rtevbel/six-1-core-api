import { UserPasswordEntity } from '../entities/user-password.entity';

/**
 * Result interface.
 *
 * Version:1.0.0.
 *
 * This interface is used as return type
 * in findall users method.
 */
export interface FindAllResultInterface {
  passwords: UserPasswordEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
