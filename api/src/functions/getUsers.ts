import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    try {
      const pool = await getPool();
      const request = pool.request();
      let query = `SELECT up.*, a.name as agency_name FROM user_profiles up LEFT JOIN agencies a ON up.agency_id = a.id WHERE 1=1`;
      const agencyIdParam = req.query.get('agencyId');
      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      if (agencyIdParam) {
        if (!isGlobal && agencyIdParam !== user.agencyId) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
        query += ' AND up.agency_id = @agencyId'; request.input('agencyId', agencyIdParam);
      } else if (!isGlobal) { query += ' AND up.agency_id = @agencyId'; request.input('agencyId', user.agencyId); }
      query += ' ORDER BY up.full_name';
      const result = await request.query(query);
      return withCors({ value: result.recordset });
    } catch (err: any) {
      context.error('[getUsers]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});