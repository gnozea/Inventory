import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateLibraryResource', {
  methods: ['PATCH'],
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

      // AgencyAdmin can only edit resources belonging to their agency
      if (user.role === 'AgencyAdmin' && resource.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only edit resources belonging to your agency' }) };
      }

      const body = await req.json() as any;
      const updates: string[] = [];
      const request = pool.request().input('id', req.params.id);

      if (body.title !== undefined)       { updates.push('title = @title');             request.input('title', body.title); }
      if (body.description !== undefined) { updates.push('description = @description'); request.input('description', body.description); }
      if (body.category_id !== undefined) { updates.push('category_id = @categoryId'); request.input('categoryId', body.category_id); }
      if (body.file_url !== undefined)    { updates.push('file_url = @fileUrl');        request.input('fileUrl', body.file_url); }
      if (body.file_type !== undefined)   { updates.push('file_type = @fileType');      request.input('fileType', body.file_type); }
      if (body.tags !== undefined)        { updates.push('tags = @tags');               request.input('tags', body.tags); }

      if (updates.length === 0) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No fields to update' }) };

      updates.push('modified_at = GETUTCDATE()');
      const result = await request.query(`UPDATE library_resources SET ${updates.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result.recordset[0]) };
    } catch (err: any) {
      context.error('[updateLibraryResource]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
