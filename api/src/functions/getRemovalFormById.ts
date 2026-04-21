import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getRemovalFormById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'removal-forms/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();

      const result = await pool.request()
        .input('id', req.params.id)
        .query(`
          SELECT f.*,
                 e.name AS equipment_name, e.serial_number AS equipment_serial,
                 e.category AS equipment_category, e.agency_id AS equipment_agency_id,
                 ea.name AS agency_name,
                 ta.name AS transfer_to_agency_name
          FROM inventory_removal_forms f
          LEFT JOIN equipment e ON f.equipment_id = e.id
          LEFT JOIN agencies ea ON e.agency_id = ea.id
          LEFT JOIN agencies ta ON f.transfer_to_agency_id = ta.id
          WHERE f.id = @id
        `);
      const form = result.recordset[0];
      if (!form) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };

      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      if (!isGlobal && form.equipment_agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(form) };
    } catch (err: any) {
      context.error('[getRemovalFormById]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
