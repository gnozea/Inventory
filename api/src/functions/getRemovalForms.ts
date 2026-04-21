import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getRemovalForms', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'removal-forms',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();
      const equipmentId = req.query.get('equipmentId') || '';
      const status = req.query.get('status') || '';
      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);

      let sql = `
        SELECT f.*,
               e.name AS equipment_name, e.serial_number AS equipment_serial,
               a.name AS agency_name
        FROM inventory_removal_forms f
        LEFT JOIN equipment e ON f.equipment_id = e.id
        LEFT JOIN agencies a ON e.agency_id = a.id
        WHERE 1=1
      `;
      const request = pool.request();

      if (!isGlobal) {
        // Only see forms for equipment belonging to the user's agency
        sql += ' AND e.agency_id = @agencyId';
        request.input('agencyId', user.agencyId);
      }
      if (status) {
        sql += ' AND f.status = @status';
        request.input('status', status);
      }
      if (equipmentId) {
        sql += ' AND f.equipment_id = @equipmentId';
        request.input('equipmentId', equipmentId);
      }

      sql += ' ORDER BY f.created_at DESC';

      const result = await request.query(sql);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: result.recordset }) };
    } catch (err: any) {
      context.error('[getRemovalForms]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
