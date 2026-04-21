import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getControlForms', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'control-forms',
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
        SELECT f.*, a.name AS agency_name,
               (SELECT COUNT(*) FROM inventory_control_form_items i WHERE i.form_id = f.id) AS item_count
        FROM inventory_control_forms f
        LEFT JOIN agencies a ON f.agency_id = a.id
        WHERE 1=1
      `;
      const request = pool.request();

      if (!isGlobal) {
        sql += ' AND f.agency_id = @agencyId';
        request.input('agencyId', user.agencyId);
      }
      if (status) {
        sql += ' AND f.status = @status';
        request.input('status', status);
      }
      if (equipmentId) {
        sql += ` AND EXISTS (SELECT 1 FROM inventory_control_form_items i WHERE i.form_id = f.id AND i.equipment_id = @equipmentId)`;
        request.input('equipmentId', equipmentId);
      }

      sql += ' ORDER BY f.created_at DESC';

      const result = await request.query(sql);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: result.recordset }) };
    } catch (err: any) {
      context.error('[getControlForms]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
