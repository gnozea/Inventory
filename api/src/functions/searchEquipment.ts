import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('searchEquipment', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'search',
  handler: async (req: any) => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, body: 'Unauthorized' };
    if (!['GlobalViewer', 'SystemAdmin'].includes(user.role)) return { status: 403, body: 'Forbidden' };

    const q = req.query.get('q') || '';
    const pool = await getPool();
    const request = pool.request();
    request.input('q', '%' + q + '%');

    let query = `
      SELECT e.*, a.name as agency_name, a.type as agency_type, l.name as location_name
      FROM equipment e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE (e.name LIKE @q OR e.serial_number LIKE @q)
    `;

    const agencyId = req.query.get('agencyId');
    const status = req.query.get('status');
    const category = req.query.get('category');
    if (agencyId) { query += ' AND e.agency_id = @agencyId'; request.input('agencyId', agencyId); }
    if (status) { query += ' AND e.status = @status'; request.input('status', parseInt(status)); }
    if (category) { query += ' AND e.category = @category'; request.input('category', category); }
    query += ' ORDER BY a.name, e.name';

    const result = await request.query(query);
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: result.recordset }),
    };
  },
});
