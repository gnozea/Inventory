import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createLibraryResource', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'library',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      const { category_id, title, description, file_url, file_type, tags } = body;

      if (!category_id || !title) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'category_id and title are required' }) };
      }

      // AgencyAdmin can only create resources for their own agency (or global if SystemAdmin)
      const agencyId = user.role === 'SystemAdmin' ? (body.agency_id ?? null) : user.agencyId;

      const pool = await getPool();
      const result = await pool.request()
        .input('categoryId', category_id)
        .input('title', title)
        .input('description', description || null)
        .input('fileUrl', file_url || null)
        .input('fileType', file_type || null)
        .input('tags', tags || null)
        .input('agencyId', agencyId)
        .input('createdBy', user.name)
        .query(`
          INSERT INTO library_resources
            (category_id, title, description, file_url, file_type, tags, agency_id, created_by)
          OUTPUT INSERTED.*
          VALUES
            (@categoryId, @title, @description, @fileUrl, @fileType, @tags, @agencyId, @createdBy)
        `);

      return { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result.recordset[0]) };
    } catch (err: any) {
      context.error('[createLibraryResource]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
