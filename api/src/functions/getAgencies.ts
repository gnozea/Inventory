import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getAgencies', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'agencies',
  handler: async (req: any) => {
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, body: 'Unauthorized' };
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM agencies ORDER BY name');
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: result.recordset }),
    };
  },
});
