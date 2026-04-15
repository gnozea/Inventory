import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getReports', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports',
  handler: async (req: any) => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, body: 'Unauthorized' };
    const pool = await getPool();
    const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);
    const filter = isGlobal ? '' : 'WHERE agency_id = @agencyId';
    const r1 = pool.request();
    const r2 = pool.request();
    if (!isGlobal) { r1.input('agencyId', user.agencyId); r2.input('agencyId', user.agencyId); }
    const s = await r1.query('SELECT status, COUNT(*) as total FROM equipment ' + filter + ' GROUP BY status');
    const c = await r2.query('SELECT category, COUNT(*) as total FROM equipment ' + filter + ' GROUP BY category');
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ byStatus: s.recordset, byCategory: c.recordset }),
    };
  },
});
