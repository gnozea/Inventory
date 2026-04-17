import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('deleteLibraryResource', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'library/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const pool = await getPool();
      const existing = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM library_resources WHERE id = @id');
      const resource = existing.recordset[0];
      if (!resource) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Resource not found' }) };

      // AgencyAdmin can only delete resources belonging to their agency
      if (user.role === 'AgencyAdmin' && resource.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only delete resources belonging to your agency' }) };
      }

      await pool.request().input('id', req.params.id).query('DELETE FROM library_resources WHERE id = @id');

      context.log(`[deleteLibraryResource] ${req.params.id} deleted by ${user.name}`);
      return { status: 204, headers: corsHeaders };
    } catch (err: any) {
      context.error('[deleteLibraryResource]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
