import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateRemovalForm', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'removal-forms/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin', 'AgencyUser'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const pool = await getPool();

      const existing = await pool.request()
        .input('id', req.params.id)
        .query(`
          SELECT f.*, e.agency_id AS equipment_agency_id
          FROM inventory_removal_forms f
          LEFT JOIN equipment e ON f.equipment_id = e.id
          WHERE f.id = @id
        `);
      const form = existing.recordset[0];
      if (!form) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };

      const isGlobal = user.role === 'SystemAdmin';
      if (!isGlobal && form.equipment_agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }
      if (form.status === 'submitted' && !isGlobal) {
        return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Submitted forms cannot be edited' }) };
      }

      const body = await req.json() as any;
      const submitNow = body.status === 'submitted';

      await pool.request()
        .input('id', form.id)
        .input('formNumber', body.form_number ?? form.form_number)
        .input('actionType', body.action_type ?? form.action_type)
        .input('dateOfAction', body.date_of_action ?? form.date_of_action)
        .input('removalReason', body.removal_reason ?? form.removal_reason)
        .input('disposalMethod', body.disposal_method ?? form.disposal_method)
        .input('transferToEntity', body.transfer_to_entity ?? form.transfer_to_entity)
        .input('transferToAgencyId', body.transfer_to_agency_id ?? form.transfer_to_agency_id)
        .input('linkedTransferRequestId', body.linked_transfer_request_id ?? form.linked_transfer_request_id)
        .input('priorLocation', body.prior_location ?? form.prior_location)
        .input('pocName', body.poc_name ?? form.poc_name)
        .input('pocTitle', body.poc_title ?? form.poc_title)
        .input('pocPhone', body.poc_phone ?? form.poc_phone)
        .input('pocEmail', body.poc_email ?? form.poc_email)
        .input('authorizedByName', body.authorized_by_name ?? form.authorized_by_name)
        .input('authorizedByTitle', body.authorized_by_title ?? form.authorized_by_title)
        .input('authorizedDate', body.authorized_date ?? form.authorized_date)
        .input('notes', body.notes ?? form.notes)
        .input('status', submitNow ? 'submitted' : 'draft')
        .query(`
          UPDATE inventory_removal_forms SET
            form_number = @formNumber,
            action_type = @actionType,
            date_of_action = @dateOfAction,
            removal_reason = @removalReason,
            disposal_method = @disposalMethod,
            transfer_to_entity = @transferToEntity,
            transfer_to_agency_id = @transferToAgencyId,
            linked_transfer_request_id = @linkedTransferRequestId,
            prior_location = @priorLocation,
            poc_name = @pocName,
            poc_title = @pocTitle,
            poc_phone = @pocPhone,
            poc_email = @pocEmail,
            authorized_by_name = @authorizedByName,
            authorized_by_title = @authorizedByTitle,
            authorized_date = @authorizedDate,
            notes = @notes,
            status = @status,
            modified_at = GETUTCDATE()
            ${submitNow && form.status !== 'submitted' ? ', submitted_at = GETUTCDATE()' : ''}
          WHERE id = @id
        `);

      context.log(`[updateRemovalForm] ${form.id} updated by ${user.name}`);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    } catch (err: any) {
      context.error('[updateRemovalForm]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
