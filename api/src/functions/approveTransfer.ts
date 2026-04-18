import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';
import { getTransferContext, notifyApproved } from '../shared/notifications';

// Approval logic:
//   Permanent transfer:
//     AgencyAdmin of from_agency at pending  → agency_approved
//     SystemAdmin                at pending  → approved (covers both stages in one step)
//     SystemAdmin                at agency_approved → approved
//   Borrow:
//     AgencyAdmin of from_agency at pending  → approved
//     SystemAdmin                at pending  → approved

app.http('approveTransfer', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'transfers/{id}/approve',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM transfer_requests WHERE id = @id');
      const tr = result.recordset[0];
      if (!tr) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Transfer not found' }) };

      const now = new Date().toISOString();
      let newStatus: string;

      const isSystemAdmin = user.role === 'SystemAdmin';
      const isAgencyAdmin = user.role === 'AgencyAdmin';

      if (tr.request_type === 'borrow') {
        // Borrows: AgencyAdmin of from_agency OR SystemAdmin gives final approval
        if (!isSystemAdmin) {
          if (!isAgencyAdmin) {
            return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only an AgencyAdmin or SystemAdmin can approve borrow requests' }) };
          }
          if (tr.from_agency_id !== user.agencyId) {
            return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only approve borrows from your own agency' }) };
          }
        }
        if (tr.status !== 'pending') {
          return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Cannot approve a borrow in status: ${tr.status}` }) };
        }
        newStatus = 'approved';

        await pool.request()
          .input('id', tr.id)
          .input('approvedBy', user.name)
          .input('approvedAt', now)
          .input('newStatus', newStatus)
          .query(`
            UPDATE transfer_requests
            SET status = @newStatus,
                agency_approved_by = @approvedBy,
                agency_approved_at = @approvedAt,
                modified_at = GETUTCDATE()
            WHERE id = @id
          `);

      } else {
        // Permanent transfer
        if (tr.status === 'pending') {
          if (isSystemAdmin) {
            // SystemAdmin covers both stages in one step
            newStatus = 'approved';
            await pool.request()
              .input('id', tr.id)
              .input('approvedBy', user.name)
              .input('approvedAt', now)
              .input('newStatus', newStatus)
              .query(`
                UPDATE transfer_requests
                SET status = @newStatus,
                    agency_approved_by = @approvedBy,
                    agency_approved_at = @approvedAt,
                    system_approved_by = @approvedBy,
                    system_approved_at = @approvedAt,
                    modified_at = GETUTCDATE()
                WHERE id = @id
              `);
          } else {
            // AgencyAdmin of from_agency — stage 1
            if (!isAgencyAdmin) {
              return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Stage 1 approval requires AgencyAdmin of the originating agency' }) };
            }
            if (tr.from_agency_id !== user.agencyId) {
              return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only approve transfers from your own agency' }) };
            }
            newStatus = 'agency_approved';
            await pool.request()
              .input('id', tr.id)
              .input('approvedBy', user.name)
              .input('approvedAt', now)
              .input('newStatus', newStatus)
              .query(`
                UPDATE transfer_requests
                SET status = @newStatus,
                    agency_approved_by = @approvedBy,
                    agency_approved_at = @approvedAt,
                    modified_at = GETUTCDATE()
                WHERE id = @id
              `);
          }

        } else if (tr.status === 'agency_approved') {
          // Stage 2: SystemAdmin only
          if (!isSystemAdmin) {
            return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Stage 2 approval requires SystemAdmin' }) };
          }
          newStatus = 'approved';
          await pool.request()
            .input('id', tr.id)
            .input('approvedBy', user.name)
            .input('approvedAt', now)
            .input('newStatus', newStatus)
            .query(`
              UPDATE transfer_requests
              SET status = @newStatus,
                  system_approved_by = @approvedBy,
                  system_approved_at = @approvedAt,
                  modified_at = GETUTCDATE()
              WHERE id = @id
            `);

        } else {
          return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Cannot approve a transfer in status: ${tr.status}` }) };
        }
      }

      context.log(`[approveTransfer] ${tr.id} → ${newStatus} by ${user.name}`);

      // Fire-and-forget notification
      getTransferContext(tr.id, pool).then(ctx => {
        if (ctx) notifyApproved(ctx, user.name, newStatus, msg => context.error(msg));
      }).catch(e => context.error('[approveTransfer notify]', e.message));

      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, newStatus }) };
    } catch (err: any) {
      context.error('[approveTransfer]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
