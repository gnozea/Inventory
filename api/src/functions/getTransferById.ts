import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getTransferById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'transfers/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', req.params.id)
        .query(`
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
          WHERE tr.id = @id
        `);

      const tr = result.recordset[0];
      if (!tr) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Transfer not found' }) };

      const isGlobal = ['SystemAdmin', 'GlobalViewer'].includes(user.role);
      if (!isGlobal && tr.from_agency_id !== user.agencyId && tr.to_agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(tr) };
    } catch (err: any) {
      context.error('[getTransferById]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
