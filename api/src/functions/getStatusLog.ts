import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getStatusLog', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'statuslog/{equipmentId}',
  handler: async (req: any) => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, body: 'Unauthorized' };

    const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);
    const pool = await getPool();

    // Verify the equipment exists and belongs to the user's agency before returning its history
    const eqCheck = await pool.request()
      .input('equipmentId', req.params.equipmentId)
      .query('SELECT agency_id FROM equipment WHERE id = @equipmentId');
    const eq = eqCheck.recordset[0];
    if (!eq) return { status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
    if (!isGlobal && eq.agency_id !== user.agencyId) return { status: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };

    const result = await pool.request()
      .input('equipmentId', req.params.equipmentId)
      .query('SELECT * FROM status_log WHERE equipment_id = @equipmentId ORDER BY created_at DESC');
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: result.recordset }),
    };
  },
});
