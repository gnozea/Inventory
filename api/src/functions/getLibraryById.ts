import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getLibraryById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'library/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', req.params.id)
        .query(`
          SELECT lr.*, lc.name AS category_name, a.name AS agency_name
          FROM library_resources lr
          JOIN library_categories lc ON lr.category_id = lc.id
          LEFT JOIN agencies a ON lr.agency_id = a.id
          WHERE lr.id = @id
        `);

      const resource = result.recordset[0];
      if (!resource) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Resource not found' }) };

      // Agency-scoped users can only see global or their own agency's resources
      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      if (!isGlobal && resource.agency_id !== null && resource.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(resource) };
    } catch (err: any) {
      context.error('[getLibraryById]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
