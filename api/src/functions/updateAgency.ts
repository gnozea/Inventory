import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateAgency', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'agencies/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (user.role !== 'SystemAdmin' && user.role !== 'AgencyAdmin') return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    try {
      const id = req.params.id;
      if (user.role === 'AgencyAdmin' && id !== user.agencyId) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Can only update your own agency' }) };
      const body = await req.json() as any;
      const pool = await getPool();
      const updates: string[] = [];
      const request = pool.request().input('id', id);
      if (body.name) { updates.push('name = @name'); request.input('name', body.name); }
      if (body.type !== undefined) { updates.push('type = @type'); request.input('type', body.type); }
      if (body.region !== undefined) { updates.push('region = @region'); request.input('region', body.region); }
      if (body.contact_email !== undefined) { updates.push('contact_email = @ce'); request.input('ce', body.contact_email); }
      if (updates.length === 0) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No fields to update' }) };
      const result = await request.query(`UPDATE agencies SET ${updates.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
      if (!result.recordset[0]) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Agency not found' }) };
      return withCors(result.recordset[0]);
    } catch (err: any) {
      context.error('[updateAgency]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});