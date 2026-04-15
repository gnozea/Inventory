import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getAgencies', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'agencies',
  handler: async (req: any) => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, body: 'Unauthorized' };

    const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);
    const pool = await getPool();
    const request = pool.request();
    const query = isGlobal
      ? 'SELECT * FROM agencies ORDER BY name'
      : 'SELECT * FROM agencies WHERE id = @agencyId ORDER BY name';
    if (!isGlobal) request.input('agencyId', user.agencyId);
    const result = await request.query(query);
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: result.recordset }),
    };
  },
});
