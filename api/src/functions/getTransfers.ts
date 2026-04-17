import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getTransfers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'transfers',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();
      const request = pool.request();

      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      const statusFilter = req.query.get('status');
      const typeFilter = req.query.get('type');

      let query = `
        SELECT
          tr.*,
          e.name  AS equipment_name,
          e.serial_number,
          fa.name AS from_agency_name,
          ta.name AS to_agency_name
        FROM transfer_requests tr
        JOIN equipment e  ON tr.equipment_id   = e.id
        JOIN agencies  fa ON tr.from_agency_id = fa.id
        JOIN agencies  ta ON tr.to_agency_id   = ta.id
        WHERE 1=1
      `;

      if (!isGlobal) {
        // Agency-scoped users see transfers where their agency is involved (either side)
        query += ' AND (tr.from_agency_id = @agencyId OR tr.to_agency_id = @agencyId)';
        request.input('agencyId', user.agencyId);
      }

      if (statusFilter) {
        query += ' AND tr.status = @status';
        request.input('status', statusFilter);
      }

      if (typeFilter) {
        query += ' AND tr.request_type = @type';
        request.input('type', typeFilter);
      }

      query += ' ORDER BY tr.created_at DESC';

      const result = await request.query(query);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: result.recordset }) };
    } catch (err: any) {
      context.error('[getTransfers]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
