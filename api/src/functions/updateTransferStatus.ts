import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

// Handles logistics transitions after approval:
//   approved → in_transit → completed (transfer)
//   approved → in_transit → returned  (borrow)
// Also allows cancellation of pending/agency_approved requests by originator agency or SystemAdmin.

const VALID_TRANSITIONS: Record<string, string[]> = {
  approved:    ['in_transit', 'cancelled'],
  in_transit:  ['completed', 'returned'],
  pending:     ['cancelled'],
  agency_approved: ['cancelled'],
};

app.http('updateTransferStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'transfers/{id}/status',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin', 'AgencyUser'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      const { status: newStatus } = body;
      if (!newStatus) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'status is required' }) };

      const pool = await getPool();
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM transfer_requests WHERE id = @id');
      const tr = result.recordset[0];
      if (!tr) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Transfer not found' }) };

      const allowed = VALID_TRANSITIONS[tr.status] || [];
      if (!allowed.includes(newStatus)) {
        return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Cannot transition from ${tr.status} to ${newStatus}` }) };
      }

      // Agency-scoped users: must be involved agency
      if (user.role !== 'SystemAdmin' && tr.from_agency_id !== user.agencyId && tr.to_agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      const request = pool.request()
        .input('id', tr.id)
        .input('newStatus', newStatus);

      let sql = `
        UPDATE transfer_requests
        SET status = @newStatus, modified_at = GETUTCDATE()
      `;

      if (newStatus === 'returned') {
        sql += ', returned_at = GETUTCDATE()';
      }

      sql += ' WHERE id = @id';
      await request.query(sql);

      context.log(`[updateTransferStatus] ${tr.id}: ${tr.status} → ${newStatus} by ${user.name}`);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, oldStatus: tr.status, newStatus }) };
    } catch (err: any) {
      context.error('[updateTransferStatus]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
