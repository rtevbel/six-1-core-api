import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Issuer, Client } from 'openid-client';
import { ensureDefinedConfigParam } from '../common/functions';

/**
 * OpenID Connect client for Google; credentials must be supplied via ConfigService / env.
 */
@Injectable()
export class OidcClient {
  constructor(private readonly configService: ConfigService) {}

  async getClient(): Promise<Client> {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    const clientId = ensureDefinedConfigParam(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      'GOOGLE_CLIENT_ID',
    );
    const clientSecret = ensureDefinedConfigParam(
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      'GOOGLE_CLIENT_SECRET',
    );
    const callbackUrl = ensureDefinedConfigParam(
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
      'GOOGLE_CALLBACK_URL',
    );

    return new googleIssuer.Client({
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [callbackUrl],
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
    });
  }
}
