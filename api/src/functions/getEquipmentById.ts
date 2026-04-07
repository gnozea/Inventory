import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getEquipmentById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'equipment/{id}',
  handler: async (req: any) => {
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, body: 'Unauthorized' };

    const pool = await getPool();
    const result = await pool.request().input('id', req.params.id).query(`
      SELECT e.*, a.name as agency_name, l.name as location_name,
             l.address as location_address, l.latitude, l.longitude
      FROM equipment e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE e.id = @id
    `);

    const eq = result.recordset[0];
    if (!eq) return { status: 404, body: 'Not found' };
    const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);
    if (!isGlobal && eq.agency_id !== user.agencyId) return { status: 403, body: 'Forbidden' };
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eq),
    };
  },
});
