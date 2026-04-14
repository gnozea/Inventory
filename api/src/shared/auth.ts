import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { getPool } from './db';

const tenantId = process.env.AZURE_AD_TENANT_ID;
const clientId = process.env.AZURE_AD_CLIENT_ID;

if (!tenantId || !clientId) {
  console.error(
    '[auth] AZURE_AD_TENANT_ID or AZURE_AD_CLIENT_ID is missing from environment variables. ' +
    'Auth will fail for all requests.'
  );
}

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000,
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  console.log('[auth] Token header:', JSON.stringify(header));

  // HS256 should NOT come from Azure AD - this indicates a configuration problem
  if (header.alg === 'HS256') {
    console.error('[auth] CRITICAL: Received HS256 token - Azure AD should issue RS256 tokens!');
    console.error('[auth] This token is either invalid or your app registration is misconfigured.');
    return callback(new Error('HS256 algorithm not supported - Azure AD tokens must use RS256'));
  }

  if (header.kid) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return callback(new Error('No signing key found'));
      callback(null, signingKey);
    });
  } else {
    console.warn('[auth] Token has no kid header — trying all JWKS keys');
    client.getSigningKeys()
      .then((keys) => {
        if (!keys || keys.length === 0) return callback(new Error('No signing keys found'));
        const signingKey = keys[0].getPublicKey();
        callback(null, signingKey);
      })
      .catch((e) => callback(e));
  }
}

export interface AuthenticatedUser {
  azureAdObjectId: string;
  name: string;
  email: string;
  role: string;
  agencyId: string | null;
  agencyName: string | null;
}

export async function getUserFromToken(
  authHeader: string | undefined | null
): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  // Debug: decode token WITHOUT verification to inspect claims
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('[auth] === TOKEN DEBUG INFO ===');
    console.log('[auth] Algorithm:', decoded?.header?.alg);
    console.log('[auth] Key ID:', decoded?.header?.kid || 'MISSING');
    console.log('[auth] Issuer:', (decoded?.payload as any)?.iss || 'MISSING');
    console.log('[auth] Audience:', (decoded?.payload as any)?.aud || 'MISSING');
    console.log('[auth] Token version:', (decoded?.payload as any)?.ver || 'MISSING');
    console.log('[auth] App ID:', (decoded?.payload as any)?.appid || (decoded?.payload as any)?.azp || 'MISSING');
    console.log('[auth] === END TOKEN DEBUG ===');
  } catch (decodeErr) {
    console.error('[auth] Failed to decode token for debugging:', decodeErr);
  }

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getSigningKey as any,
      {
        audience: [`api://${clientId}`, clientId!],
        algorithms: ['RS256'],
      } as jwt.VerifyOptions,
      async (err, decoded: any) => {
        if (err) {
          console.warn('[auth] Token verification failed:', err.message);
          resolve(null);
          return;
        }

        const objectId = decoded?.oid || decoded?.sub;
        if (!objectId) {
          console.warn('[auth] Token has no oid or sub claim');
          resolve(null);
          return;
        }

        const tokenEmail = (
          decoded?.preferred_username ||
          decoded?.email ||
          decoded?.upn ||
          ''
        ).toLowerCase().trim();

        const tokenName = decoded?.name || '';

        try {
          const pool = await getPool();

          const result = await pool
            .request()
            .input('objectId', objectId)
            .query(`
              SELECT up.*, a.name AS agency_name
              FROM user_profiles up
              LEFT JOIN agencies a ON up.agency_id = a.id
              WHERE up.azure_ad_object_id = @objectId
            `);

          let user = result.recordset[0];

          if (!user && tokenEmail) {
            console.log(`[auth] No user for OID ${objectId}, trying email match: ${tokenEmail}`);

            const emailMatch = await pool
              .request()
              .input('email', tokenEmail)
              .query(`
                SELECT up.*, a.name AS agency_name
                FROM user_profiles up
                LEFT JOIN agencies a ON up.agency_id = a.id
                WHERE LOWER(up.email) = @email
                  AND up.azure_ad_object_id LIKE 'pending-%'
              `);

            if (emailMatch.recordset[0]) {
              user = emailMatch.recordset[0];
              console.log(`[auth] Email match found: ${tokenEmail} → linking to OID ${objectId}`);

              await pool
                .request()
                .input('id', user.id)
                .input('objectId', objectId)
                .input('name', tokenName || user.full_name)
                .query(`
                  UPDATE user_profiles
                  SET azure_ad_object_id = @objectId,
                      full_name = @name
                  WHERE id = @id
                `);

              console.log(`[auth] Auto-linked user ${tokenEmail} (${user.role}) → OID ${objectId}`);
            } else {
              console.warn(`[auth] No user profile found for OID ${objectId} or email ${tokenEmail}`);
              resolve(null);
              return;
            }
          }

          if (!user) {
            console.warn(`[auth] No user profile found for OID: ${objectId}`);
            resolve(null);
            return;
          }

          resolve({
            azureAdObjectId: objectId,
            name: user.full_name,
            email: user.email,
            role: user.role,
            agencyId: user.agency_id,
            agencyName: user.agency_name ?? null,
          });
        } catch (dbErr: any) {
          console.error('[auth] Database error looking up user:', dbErr.message);
          resolve(null);
        }
      }
    );
  });
}