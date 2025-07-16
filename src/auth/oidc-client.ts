import { Issuer, Client } from 'openid-client';

export class OidcClient {
  async getClient() {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    const client = new googleIssuer.Client({
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
      client_id:
        'REDACTED_SET_GOOGLE_CLIENT_ID_VIA_ENV',
      client_secret: 'REDACTED_SET_GOOGLE_CLIENT_SECRET_VIA_ENV',
      redirect_uris: ['http://localhost:3005/auth/callback'],
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
    });

    return client;
  }
}
