import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getEquipment', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'equipment',
  handler: async (req: any) => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, body: 'Unauthorized' };

    const status = req.query.get('status');
    const category = req.query.get('category');
    const search = req.query.get('search');
    const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);

    let query = `
      SELECT e.*, a.name as agency_name, l.name as location_name
      FROM equipment e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE 1=1
    `;

    const pool = await getPool();
    const request = pool.request();

    if (!isGlobal) { query += ' AND e.agency_id = @agencyId'; request.input('agencyId', user.agencyId); }
    if (status) { query += ' AND e.status = @status'; request.input('status', parseInt(status)); }
    if (category) { query += ' AND e.category = @category'; request.input('category', category); }
    if (search) { query += ' AND (e.name LIKE @search OR e.serial_number LIKE @search)'; request.input('search', '%' + search + '%'); }
    query += ' ORDER BY e.modified_at DESC';

    const result = await request.query(query);
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: result.recordset }),
    };
  },
});
