import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    try {
      const body = await req.json() as any;
      const { full_name, email, role, agency_id, azure_ad_object_id } = body;
      if (!full_name || !email || !role) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'full_name, email, and role are required' }) };
      const targetAgencyId = agency_id || user.agencyId;
      if (user.role === 'AgencyAdmin' && targetAgencyId !== user.agencyId) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Can only create users in your agency' }) };
      if (user.role === 'AgencyAdmin' && !['AgencyAdmin', 'AgencyUser', 'AgencyReporter'].includes(role)) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid role for AgencyAdmin' }) };
      const pool = await getPool();
      const result = await pool.request()
        .input('oid', azure_ad_object_id || `pending-${Date.now()}`)
        .input('full_name', full_name).input('email', email).input('role', role).input('agency_id', targetAgencyId)
        .query(`INSERT INTO user_profiles (id, azure_ad_object_id, full_name, email, role, agency_id, created_at) OUTPUT INSERTED.* VALUES (NEWID(), @oid, @full_name, @email, @role, @agency_id, GETUTCDATE())`);
      return withCors(result.recordset[0], 201);
    } catch (err: any) {
      context.error('[createUser]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});