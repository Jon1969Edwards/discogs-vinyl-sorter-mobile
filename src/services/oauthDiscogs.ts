/**
 * Discogs OAuth 1.0a flow.
 * Uses request_token → authorize → access_token with callback via deep link.
 */

import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const API_BASE = 'https://api.discogs.com';
const AUTH_BASE = 'https://www.discogs.com';
const USER_AGENT = 'DiscogsVinylSorter/1.0 (https://github.com/discogs-vinyl-sorter-mobile)';

export interface OAuthTokens {
  token: string;
  secret: string;
}

/** HMAC-SHA1 for OAuth 1.0a using crypto-js (React Native compatible). */
function hmacSha1Base64(message: string, key: string): string {
  const hash = CryptoJS.HmacSHA1(message, key);
  return CryptoJS.enc.Base64.stringify(hash);
}

function createOAuth(consumerKey: string, consumerSecret: string) {
  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return hmacSha1Base64(baseString, key);
    },
  });
}

/** Get request token and build authorize URL. Discogs uses GET for request_token. */
async function getRequestToken(
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ oauthToken: string; oauthTokenSecret: string; authorizeUrl: string }> {
  const oauth = createOAuth(consumerKey, consumerSecret);
  const requestData = {
    url: `${API_BASE}/oauth/request_token`,
    method: 'GET' as const,
    data: { oauth_callback: callbackUrl },
  };
  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const response = await fetch(`${API_BASE}/oauth/request_token`, {
    method: 'GET',
    headers: {
      Authorization: authHeader.Authorization,
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discogs request token failed: ${response.status} – ${text}`);
  }

  const text = await response.text();
  const params = new URLSearchParams(text);
  const oauthToken = params.get('oauth_token');
  const oauthTokenSecret = params.get('oauth_token_secret');

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error('Invalid Discogs response: missing token');
  }

  const authorizeUrl = `${AUTH_BASE}/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`;
  return { oauthToken, oauthTokenSecret, authorizeUrl };
}

/** Exchange verifier for access token. */
async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  oauthVerifier: string
): Promise<OAuthTokens> {
  const oauth = createOAuth(consumerKey, consumerSecret);
  const requestData = {
    url: `${API_BASE}/oauth/access_token`,
    method: 'POST',
    data: {
      oauth_token: requestToken,
      oauth_verifier: oauthVerifier,
    },
  };
  const authHeader = oauth.toHeader(
    oauth.authorize(requestData, {
      key: requestToken,
      secret: requestTokenSecret,
    })
  );

  const body = new URLSearchParams({
    oauth_token: requestToken,
    oauth_verifier: oauthVerifier,
  }).toString();

  const response = await fetch(`${API_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: {
      Authorization: authHeader.Authorization,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discogs access token failed: ${response.status} – ${text}`);
  }

  const resText = await response.text();
  const params = new URLSearchParams(resText);
  const token = params.get('oauth_token');
  const secret = params.get('oauth_token_secret');

  if (!token || !secret) {
    throw new Error('Invalid Discogs response: missing access token');
  }

  return { token, secret };
}

/**
 * Run the full OAuth flow: open browser, user authorizes, return access tokens.
 * Uses WebBrowser.openAuthSessionAsync to capture the redirect.
 */
export async function runDiscogsOAuthFlow(
  consumerKey: string,
  consumerSecret: string
): Promise<OAuthTokens> {
  const scheme = 'discogvinylsorter';
  const callbackPath = '/oauth/callback';
  const callbackUrl = `${scheme}://${callbackPath}`;

  const { oauthToken, oauthTokenSecret, authorizeUrl } = await getRequestToken(
    consumerKey,
    consumerSecret,
    callbackUrl
  );

  const result = await WebBrowser.openAuthSessionAsync(
    authorizeUrl,
    callbackUrl
  );

  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth was cancelled or failed');
  }

  const url = result.url;
  const queryIndex = url.indexOf('?');
  const searchParams = new URLSearchParams(
    queryIndex >= 0 ? url.substring(queryIndex) : ''
  );
  const oauthVerifier = searchParams.get('oauth_verifier');
  const returnedToken = searchParams.get('oauth_token');

  if (!oauthVerifier || !returnedToken) {
    throw new Error('OAuth callback missing verifier or token');
  }

  if (returnedToken !== oauthToken) {
    throw new Error('OAuth token mismatch');
  }

  return getAccessToken(
    consumerKey,
    consumerSecret,
    oauthToken,
    oauthTokenSecret,
    oauthVerifier
  );
}
