import { UserEntity } from '../entities/user.entity';

/**
 * Result interface.
 *
 * Version:1.0.0.
 *
 * This interface is used as return type
 * in findall users method.
 */
export interface FindAllResultInterface {
  users: UserEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
