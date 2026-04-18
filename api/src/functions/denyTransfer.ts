import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';
import { getTransferContext, notifyDenied } from '../shared/notifications';

// Either the from_agency AgencyAdmin or a SystemAdmin can deny at any pending/agency_approved stage.

app.http('denyTransfer', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'transfers/{id}/deny',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      const pool = await getPool();
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM transfer_requests WHERE id = @id');
      const tr = result.recordset[0];
      if (!tr) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Transfer not found' }) };

      // Only deniable when pending or agency_approved
      if (!['pending', 'agency_approved'].includes(tr.status)) {
        return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Cannot deny a transfer in status: ${tr.status}` }) };
      }

      // AgencyAdmin: must be from the originating agency
      if (user.role === 'AgencyAdmin' && tr.from_agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only deny transfers from your own agency' }) };
      }

      await pool.request()
        .input('id', tr.id)
        .input('deniedBy', user.name)
        .input('denialReason', body.reason || null)
        .query(`
          UPDATE transfer_requests
          SET status        = 'denied',
              denied_by     = @deniedBy,
              denied_at     = GETUTCDATE(),
              denial_reason = @denialReason,
              modified_at   = GETUTCDATE()
          WHERE id = @id
        `);

      context.log(`[denyTransfer] ${tr.id} denied by ${user.name}`);

      // Fire-and-forget notification
      getTransferContext(tr.id, pool).then(ctx => {
        if (ctx) notifyDenied(ctx, user.name, body.reason || null, msg => context.error(msg));
      }).catch(e => context.error('[denyTransfer notify]', e.message));

      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    } catch (err: any) {
      context.error('[denyTransfer]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
