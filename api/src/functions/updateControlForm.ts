import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('updateControlForm', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'control-forms/{id}',
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
        .query('SELECT * FROM inventory_control_forms WHERE id = @id');
      const form = existing.recordset[0];
      if (!form) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };

      const isGlobal = user.role === 'SystemAdmin';
      if (!isGlobal && form.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }
      // Submitted forms locked except for SystemAdmin
      if (form.status === 'submitted' && !isGlobal) {
        return { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Submitted forms cannot be edited' }) };
      }

      const body = await req.json() as any;
      const submitNow = body.status === 'submitted';

      await pool.request()
        .input('id', form.id)
        .input('formNumber', body.form_number || form.form_number)
        .input('grantYear', body.grant_year ?? form.grant_year)
        .input('poNumber', body.po_number ?? form.po_number)
        .input('vendorName', body.vendor_name ?? form.vendor_name)
        .input('vendorContact', body.vendor_contact ?? form.vendor_contact)
        .input('invoiceNumber', body.invoice_number ?? form.invoice_number)
        .input('receivedDate', body.received_date ?? form.received_date)
        .input('receivedByName', body.received_by_name ?? form.received_by_name)
        .input('receivedByTitle', body.received_by_title ?? form.received_by_title)
        .input('receivingLocation', body.receiving_location ?? form.receiving_location)
        .input('discrepancies', body.discrepancies ?? form.discrepancies)
        .input('notes', body.notes ?? form.notes)
        .input('status', submitNow ? 'submitted' : 'draft')
        .query(`
          UPDATE inventory_control_forms
          SET form_number = @formNumber,
              grant_year = @grantYear,
              po_number = @poNumber,
              vendor_name = @vendorName,
              vendor_contact = @vendorContact,
              invoice_number = @invoiceNumber,
              received_date = @receivedDate,
              received_by_name = @receivedByName,
              received_by_title = @receivedByTitle,
              receiving_location = @receivingLocation,
              discrepancies = @discrepancies,
              notes = @notes,
              status = @status,
              modified_at = GETUTCDATE()
              ${submitNow && form.status !== 'submitted' ? ', submitted_at = GETUTCDATE()' : ''}
          WHERE id = @id
        `);

      // Replace items if provided
      if (Array.isArray(body.items)) {
        await pool.request().input('formId', form.id)
          .query('DELETE FROM inventory_control_form_items WHERE form_id = @formId');

        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          await pool.request()
            .input('id', require('crypto').randomUUID())
            .input('formId', form.id)
            .input('equipmentId', item.equipment_id || null)
            .input('lineNumber', i + 1)
            .input('itemName', item.item_name || '')
            .input('category', item.category || null)
            .input('quantity', item.quantity ?? 1)
            .input('unitPrice', item.unit_price ?? null)
            .input('tagNumber', item.tag_number || null)
            .input('serialNumber', item.serial_number || null)
            .input('makeModel', item.make_model || null)
            .input('year', item.year || null)
            .input('grantNumber', item.grant_number || null)
            .input('conditionAtReceipt', item.condition_at_receipt || null)
            .input('discrepancyNoted', item.discrepancy_noted ? 1 : 0)
            .input('discrepancyNotes', item.discrepancy_notes || null)
            .query(`
              INSERT INTO inventory_control_form_items
                (id, form_id, equipment_id, line_number, item_name, category, quantity, unit_price,
                 tag_number, serial_number, make_model, year, grant_number,
                 condition_at_receipt, discrepancy_noted, discrepancy_notes)
              VALUES
                (@id, @formId, @equipmentId, @lineNumber, @itemName, @category, @quantity, @unitPrice,
                 @tagNumber, @serialNumber, @makeModel, @year, @grantNumber,
                 @conditionAtReceipt, @discrepancyNoted, @discrepancyNotes)
            `);
        }
      }

      context.log(`[updateControlForm] ${form.id} updated by ${user.name}`);
      return { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    } catch (err: any) {
      context.error('[updateControlForm]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
