/**
 * User JWT token response interface.
 *
 * Version:1.0.0.
 */
export interface UserJWTTokenResponseInterface {
  access_token: string;
  refresh_token?: string;
}
