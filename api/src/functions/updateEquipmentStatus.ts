import { app } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateEquipmentStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'equipment/{id}/status',
  handler: async (req: any) => {
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, body: 'Unauthorized' };
    if (['AgencyReporter', 'GlobalViewer'].includes(user.role)) return { status: 403, body: 'Forbidden' };

    const body = await req.json();
    const pool = await getPool();
    const existing = await pool.request().input('id', req.params.id)
      .query('SELECT agency_id, status FROM equipment WHERE id = @id');
    const eq = existing.recordset[0];
    if (!eq) return { status: 404, body: 'Not found' };
    if (user.role !== 'SystemAdmin' && eq.agency_id !== user.agencyId) return { status: 403, body: 'Forbidden' };

    await pool.request().input('id', req.params.id).input('status', body.newStatus)
      .query('UPDATE equipment SET status = @status, modified_at = GETUTCDATE() WHERE id = @id');

    await pool.request()
      .input('equipmentId', req.params.id)
      .input('oldStatus', body.oldStatus ?? eq.status)
      .input('newStatus', body.newStatus)
      .input('notes', body.notes)
      .input('changedBy', user.name)
      .query('INSERT INTO status_log (equipment_id, old_status, new_status, notes, changed_by) VALUES (@equipmentId, @oldStatus, @newStatus, @notes, @changedBy)');

    return { status: 204 };
  },
});
