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
  jwksUri: `https://login.microsoftonline.com/common/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000,
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (header.kid) {
    // v2 token — look up by kid directly
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return callback(new Error('No signing key found'));
      callback(null, signingKey);
    });
  } else {
    // v1 token — no kid in header, try all signing keys
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

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getSigningKey as any,
      {
        audience: [`api://${clientId}`, clientId!],
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