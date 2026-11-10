import { Issuer } from 'openid-client';

/**
 * Google OIDC client. Credentials must come from environment — never hardcode.
 * Expected: GOOGLE_OIDC_CLIENT_ID, GOOGLE_OIDC_CLIENT_SECRET, GOOGLE_OIDC_REDIRECT_URI
 */
export class OidcClient {
  async getClient() {
    const clientId = process.env.GOOGLE_OIDC_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OIDC_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_OIDC_REDIRECT_URI ||
      'http://localhost:3005/auth/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing GOOGLE_OIDC_CLIENT_ID or GOOGLE_OIDC_CLIENT_SECRET',
      );
    }

    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    const client = new googleIssuer.Client({
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
    });

    return client;
  }
}
