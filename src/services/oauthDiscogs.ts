/**
 * Discogs OAuth 1.0a for mobile (discogvinylsorter://callback).
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';
import { DISCOGS_CONSUMER_KEY, DISCOGS_CONSUMER_SECRET } from '@env';
import { DEFAULT_USER_AGENT } from '../constants/version';

WebBrowser.maybeCompleteAuthSession();

const API_BASE = 'https://api.discogs.com';
const OAUTH_REQUEST_URL = `${API_BASE}/oauth/request_token`;
const OAUTH_ACCESS_URL = `${API_BASE}/oauth/access_token`;
const OAUTH_AUTHORIZE_URL = 'https://www.discogs.com/oauth/authorize';
const CALLBACK_URL = 'discogvinylsorter://callback';
const USER_AGENT = DEFAULT_USER_AGENT;

function createOAuth(consumerKey: string, consumerSecret: string) {
  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
    },
  });
}

export function getConsumerCredentials(): { key: string; secret: string } | null {
  const key = (DISCOGS_CONSUMER_KEY || '').trim();
  const secret = (DISCOGS_CONSUMER_SECRET || '').trim();
  if (key && secret) return { key, secret };
  return null;
}

export function isOAuthConfigured(): boolean {
  return getConsumerCredentials() !== null;
}

async function oauthPost(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token?: { key: string; secret: string },
  extra?: Record<string, string>
): Promise<string> {
  const oauth = createOAuth(consumerKey, consumerSecret);
  const requestData = { url, method: 'POST' as const, data: extra };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
  const body = extra ? new URLSearchParams(extra).toString() : undefined;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  return resp.text();
}

function parseOAuthResponse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split('&')) {
    const [k, v] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export async function runOAuthFlow(): Promise<{
  accessToken: string;
  accessSecret: string;
}> {
  const creds = getConsumerCredentials();
  if (!creds) {
    throw new Error(
      'OAuth is not configured. Add DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET to .env, or use a Personal Access Token.'
    );
  }

  const reqText = await oauthPost(
    OAUTH_REQUEST_URL,
    creds.key,
    creds.secret,
    undefined,
    { oauth_callback: CALLBACK_URL }
  );
  const reqTokens = parseOAuthResponse(reqText);
  const requestToken = reqTokens.oauth_token;
  const requestTokenSecret = reqTokens.oauth_token_secret;
  if (!requestToken || !requestTokenSecret) {
    throw new Error(`OAuth request token failed: ${reqText}`);
  }

  const authUrl = `${OAUTH_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(requestToken)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, CALLBACK_URL);

  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth cancelled or failed');
  }

  const parsed = Linking.parse(result.url);
  const verifierRaw = parsed.queryParams?.oauth_verifier;
  const verifier = Array.isArray(verifierRaw)
    ? verifierRaw[0]
    : (verifierRaw as string | undefined);
  if (!verifier) {
    throw new Error('OAuth: no verifier in callback');
  }

  const accessText = await oauthPost(
    OAUTH_ACCESS_URL,
    creds.key,
    creds.secret,
    { key: requestToken, secret: requestTokenSecret },
    { oauth_verifier: verifier }
  );
  const accessTokens = parseOAuthResponse(accessText);
  const accessToken = accessTokens.oauth_token;
  const accessSecret = accessTokens.oauth_token_secret;
  if (!accessToken || !accessSecret) {
    throw new Error(`OAuth access token failed: ${accessText}`);
  }

  return { accessToken, accessSecret };
}

export function getOAuthAuthHeader(
  url: string,
  method: 'GET' | 'POST',
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessSecret: string
): Record<string, string> {
  const oauth = createOAuth(consumerKey, consumerSecret);
  return oauth.toHeader(
    oauth.authorize(
      { url, method },
      { key: accessToken, secret: accessSecret }
    )
  );
}
