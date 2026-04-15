import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateUser', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    try {
      const id = req.params.id;
      const body = await req.json() as any;
      const pool = await getPool();
      const target = await pool.request().input('id', id).query('SELECT * FROM user_profiles WHERE id = @id');
      if (!target.recordset[0]) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'User not found' }) };
      if (user.role === 'AgencyAdmin' && target.recordset[0].agency_id !== user.agencyId) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Cannot modify users outside your agency' }) };
      const updates: string[] = [];
      const request = pool.request().input('id', id);
      if (body.role) {
        if (user.role === 'AgencyAdmin' && !['AgencyAdmin', 'AgencyUser', 'AgencyReporter'].includes(body.role)) {
          return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AgencyAdmin cannot assign this role' }) };
        }
        updates.push('role = @role'); request.input('role', body.role);
      }
      if (body.full_name) { updates.push('full_name = @full_name'); request.input('full_name', body.full_name); }
      if (body.email) { updates.push('email = @email'); request.input('email', body.email); }
      if (updates.length === 0) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No fields to update' }) };
      const result = await request.query(`UPDATE user_profiles SET ${updates.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
      return withCors(result.recordset[0]);
    } catch (err: any) {
      context.error('[updateUser]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});