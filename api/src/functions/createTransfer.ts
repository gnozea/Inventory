import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';
import { getTransferContext, notifyNewRequest } from '../shared/notifications';

app.http('createTransfer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'transfers',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    // Only agency-scoped editors and SystemAdmin can initiate requests
    if (!['SystemAdmin', 'AgencyAdmin', 'AgencyUser'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      const { equipment_id, request_type, to_agency_id, notes, expected_return_date } = body;

      if (!equipment_id || !request_type || !to_agency_id) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'equipment_id, request_type, and to_agency_id are required' }) };
      }

      if (!['transfer', 'borrow'].includes(request_type)) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'request_type must be transfer or borrow' }) };
      }

      if (request_type === 'borrow' && !expected_return_date) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'expected_return_date is required for borrows' }) };
      }

      const pool = await getPool();

      // Verify equipment exists and get its owning agency
      const eqResult = await pool.request()
        .input('equipmentId', equipment_id)
        .query('SELECT id, agency_id FROM equipment WHERE id = @equipmentId');
      const eq = eqResult.recordset[0];
      if (!eq) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Equipment not found' }) };

      // Non-admin: can only request transfers FROM their own agency's equipment
      if (user.role !== 'SystemAdmin' && eq.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'You can only request transfers for equipment owned by your agency' }) };
      }

      const result = await pool.request()
        .input('equipmentId', equipment_id)
        .input('requestType', request_type)
        .input('fromAgencyId', eq.agency_id)
        .input('toAgencyId', to_agency_id)
        .input('requestedById', user.azureAdObjectId)
        .input('requestedByName', user.name)
        .input('notes', notes || null)
        .input('expectedReturnDate', expected_return_date || null)
        .query(`
          INSERT INTO transfer_requests
            (equipment_id, request_type, from_agency_id, to_agency_id,
             requested_by_id, requested_by_name, notes, expected_return_date)
          OUTPUT INSERTED.*
          VALUES
            (@equipmentId, @requestType, @fromAgencyId, @toAgencyId,
             @requestedById, @requestedByName, @notes, @expectedReturnDate)
        `);

      const newId = result.recordset[0].id;
      context.log(`[createTransfer] ${request_type} created for equipment ${equipment_id} by ${user.name}`);

      // Fire-and-forget notification
      getTransferContext(newId, pool).then(tr => {
        if (tr) notifyNewRequest(tr, msg => context.error(msg));
      }).catch(e => context.error('[createTransfer notify]', e.message));

      return { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result.recordset[0]) };
    } catch (err: any) {
      context.error('[createTransfer]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
