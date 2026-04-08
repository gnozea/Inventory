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
  if (!header.kid) {
    return callback(new Error('JWT header missing kid'));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    if (!signingKey) return callback(new Error('No signing key found'));
    callback(null, signingKey);
  });
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
        audience: `api://${clientId}`,
        issuer: [
          `https://login.microsoftonline.com/${tenantId}/v2.0`,
          `https://sts.windows.net/${tenantId}/`,
        ],
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

        // Extract email from token claims (works for any Microsoft account type)
        const tokenEmail = (
          decoded?.preferred_username ||
          decoded?.email ||
          decoded?.upn ||
          ''
        ).toLowerCase().trim();

        const tokenName = decoded?.name || '';

        try {
          const pool = await getPool();

          // ── Step 1: Look up by Azure AD Object ID (exact match) ──
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

          // ── Step 2: Auto-match by email if no exact OID match ──
          //
          // When a SystemAdmin creates a user via Settings → Global Users
          // or Settings → Agency Users, the azure_ad_object_id is set to
          // "pending-{timestamp}" because the admin doesn't know the
          // person's Azure AD Object ID.
          //
          // When that person signs in for the first time (with any
          // Microsoft account — work, school, or personal), we match
          // them by email and auto-link their real Object ID.
          //
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

              // Update the placeholder with the real Azure AD Object ID
              // and update the display name from the token if available
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