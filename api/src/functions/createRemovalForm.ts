import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createRemovalForm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'removal-forms',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin', 'AgencyUser'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      if (!body.equipment_id) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'equipment_id is required' }) };
      }
      if (!['removal', 'transfer'].includes(body.action_type)) {
        return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'action_type must be removal or transfer' }) };
      }

      const pool = await getPool();

      // Verify equipment belongs to user's agency (unless SystemAdmin)
      if (user.role !== 'SystemAdmin') {
        const eq = await pool.request().input('id', body.equipment_id)
          .query('SELECT agency_id FROM equipment WHERE id = @id');
        if (!eq.recordset[0]) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Equipment not found' }) };
        if (eq.recordset[0].agency_id !== user.agencyId) {
          return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Equipment does not belong to your agency' }) };
        }
      }

      const year = new Date().getFullYear();
      const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
      const formNumber = body.form_number?.trim() || `IRF-${year}-${rand}`;
      const newId = require('crypto').randomUUID();
      const submitNow = body.status === 'submitted';

      await pool.request()
        .input('id', newId)
        .input('formNumber', formNumber)
        .input('equipmentId', body.equipment_id)
        .input('actionType', body.action_type)
        .input('dateOfAction', body.date_of_action || null)
        .input('removalReason', body.removal_reason || null)
        .input('disposalMethod', body.disposal_method || null)
        .input('transferToEntity', body.transfer_to_entity || null)
        .input('transferToAgencyId', body.transfer_to_agency_id || null)
        .input('linkedTransferRequestId', body.linked_transfer_request_id || null)
        .input('priorLocation', body.prior_location || null)
        .input('pocName', body.poc_name || null)
        .input('pocTitle', body.poc_title || null)
        .input('pocPhone', body.poc_phone || null)
        .input('pocEmail', body.poc_email || null)
        .input('authorizedByName', body.authorized_by_name || null)
        .input('authorizedByTitle', body.authorized_by_title || null)
        .input('authorizedDate', body.authorized_date || null)
        .input('notes', body.notes || null)
        .input('status', submitNow ? 'submitted' : 'draft')
        .input('createdById', user.azureAdObjectId)
        .input('createdByName', user.name)
        .query(`
          INSERT INTO inventory_removal_forms
            (id, form_number, equipment_id, action_type, date_of_action,
             removal_reason, disposal_method, transfer_to_entity, transfer_to_agency_id,
             linked_transfer_request_id, prior_location, poc_name, poc_title, poc_phone, poc_email,
             authorized_by_name, authorized_by_title, authorized_date, notes,
             status, created_by_id, created_by_name, submitted_at)
          VALUES
            (@id, @formNumber, @equipmentId, @actionType, @dateOfAction,
             @removalReason, @disposalMethod, @transferToEntity, @transferToAgencyId,
             @linkedTransferRequestId, @priorLocation, @pocName, @pocTitle, @pocPhone, @pocEmail,
             @authorizedByName, @authorizedByTitle, @authorizedDate, @notes,
             @status, @createdById, @createdByName, ${submitNow ? 'GETUTCDATE()' : 'NULL'})
        `);

      context.log(`[createRemovalForm] created ${newId} by ${user.name}`);
      return { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: newId, form_number: formNumber }) };
    } catch (err: any) {
      context.error('[createRemovalForm]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
