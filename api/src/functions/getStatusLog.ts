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
    const pool = await getPool();
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
