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
  // Reject HS256 - Azure AD should only issue RS256 tokens
  if (header.alg === 'HS256') {
    return callback(new Error('HS256 algorithm not supported - Azure AD tokens must use RS256'));
  }

  if (header.kid) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('[auth] Error getting signing key:', err.message);
        return callback(err);
      }
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

// SWA Easy Auth rewrites the Authorization header with its own HS256 token.
// Only X-MSAL-Token is accepted; the standard Authorization header is ignored.
export function resolveAuthHeader(
  req: { headers: { get: (name: string) => string | null } }
): string | null {
  return req.headers.get('x-msal-token');
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
    console.warn('[auth] No Authorization header or invalid format');
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('[auth] No token in Authorization header');
    return null;
  }

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getSigningKey as any,
      {
        audience: [`api://${clientId}`, clientId!],
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
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

        // Redacted identifiers for safe logging — not suitable for lookup, only for log correlation
        const safeEmail = tokenEmail ? tokenEmail.substring(0, 3) + '…' : '(none)';
        const safeOid = objectId ? objectId.slice(-8) : '(none)';

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
            console.log(`[auth] OID lookup miss (…${safeOid}), attempting pre-approved email match`);

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
              console.log(`[auth] Pre-approved email matched (${safeEmail}), linking account`);

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

              console.log(`[auth] Account linked for role: ${user.role}`);
            } else {
              console.warn(`[auth] No pre-approved profile found for OID …${safeOid} or email ${safeEmail}`);
              resolve(null);
              return;
            }
          }

          if (!user) {
            console.warn(`[auth] No user profile found for OID …${safeOid}`);
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