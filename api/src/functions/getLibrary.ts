import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getLibrary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'library',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();
      const request = pool.request();

      const categoryId = req.query.get('categoryId');
      const search = req.query.get('search');

      // Users see global resources (agency_id IS NULL) + their own agency's resources
      // GlobalViewer and SystemAdmin see everything
      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);

      let query = `
        SELECT lr.*, lc.name AS category_name, a.name AS agency_name
        FROM library_resources lr
        JOIN library_categories lc ON lr.category_id = lc.id
        LEFT JOIN agencies a ON lr.agency_id = a.id
        WHERE 1=1
      `;

      if (!isGlobal) {
        query += ' AND (lr.agency_id IS NULL OR lr.agency_id = @agencyId)';
        request.input('agencyId', user.agencyId);
      }

      if (categoryId) {
        query += ' AND lr.category_id = @categoryId';
        request.input('categoryId', categoryId);
      }

      if (search) {
        query += ' AND (lr.title LIKE @search OR lr.description LIKE @search OR lr.tags LIKE @search)';
        request.input('search', `%${search}%`);
      }

      query += ' ORDER BY lc.name, lr.title';

      const result = await request.query(query);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: result.recordset }) };
    } catch (err: any) {
      context.error('[getLibrary]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
