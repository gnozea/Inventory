import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateEquipmentStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'equipment/{id}/status',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (['AgencyReporter', 'GlobalViewer'].includes(user.role)) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };

    try {
      const body = await req.json() as any;
      const pool = await getPool();
      const existing = await pool.request().input('id', req.params.id)
        .query('SELECT agency_id, status FROM equipment WHERE id = @id');
      const eq = existing.recordset[0];
      if (!eq) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
      if (user.role !== 'SystemAdmin' && eq.agency_id !== user.agencyId) return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };

      // Accept both naming conventions from frontend
      const newStatus = body.newStatus ?? body.status;
      const oldStatus = body.oldStatus ?? eq.status;

      if (newStatus == null) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'newStatus or status is required' }) };

      // Update equipment status
      await pool.request()
        .input('id', req.params.id)
        .input('status', newStatus)
        .query('UPDATE equipment SET status = @status, modified_at = GETUTCDATE() WHERE id = @id');

      // Log the status change with proper ID
      await pool.request()
        .input('id', 'newid')
        .input('equipmentId', req.params.id)
        .input('oldStatus', oldStatus)
        .input('newStatus', newStatus)
        .input('notes', body.notes || null)
        .input('changedBy', body.changed_by || user.name)
        .query(`INSERT INTO status_log (id, equipment_id, old_status, new_status, notes, changed_by, created_at)
                VALUES (NEWID(), @equipmentId, @oldStatus, @newStatus, @notes, @changedBy, GETUTCDATE())`);

      context.log(`[updateEquipmentStatus] ${req.params.id}: ${oldStatus} → ${newStatus} by ${user.name}`);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, oldStatus, newStatus }) };
    } catch (err: any) {
      context.error('[updateEquipmentStatus] Error:', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
