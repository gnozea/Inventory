import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createLibraryCategory', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'library/categories',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (user.role !== 'SystemAdmin') {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only SystemAdmin can create library categories' }) };
    }

    try {
      const body = await req.json() as any;
      if (!body.name) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'name is required' }) };

      const pool = await getPool();
      const result = await pool.request()
        .input('name', body.name)
        .input('description', body.description || null)
        .query(`
          INSERT INTO library_categories (name, description)
          OUTPUT INSERTED.*
          VALUES (@name, @description)
        `);

      return { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result.recordset[0]) };
    } catch (err: any) {
      context.error('[createLibraryCategory]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
