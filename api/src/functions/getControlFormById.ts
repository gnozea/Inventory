import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getControlFormById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'control-forms/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();

      const formResult = await pool.request()
        .input('id', req.params.id)
        .query(`
          SELECT f.*, a.name AS agency_name
          FROM inventory_control_forms f
          LEFT JOIN agencies a ON f.agency_id = a.id
          WHERE f.id = @id
        `);
      const form = formResult.recordset[0];
      if (!form) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };

      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      if (!isGlobal && form.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      const itemsResult = await pool.request()
        .input('formId', form.id)
        .query('SELECT * FROM inventory_control_form_items WHERE form_id = @formId ORDER BY line_number ASC');

      return {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: itemsResult.recordset }),
      };
    } catch (err: any) {
      context.error('[getControlFormById]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
