import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createControlForm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'control-forms',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };

    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!['SystemAdmin', 'AgencyAdmin', 'AgencyUser'].includes(user.role)) {
      return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const body = await req.json() as any;
      const pool = await getPool();

      const year = new Date().getFullYear();
      const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
      const formNumber = body.form_number?.trim() || `ICF-${year}-${rand}`;

      const newId = require('crypto').randomUUID();
      const agencyId = user.role === 'SystemAdmin' ? (body.agency_id || user.agencyId) : user.agencyId;
      const submitNow = body.status === 'submitted';

      await pool.request()
        .input('id', newId)
        .input('formNumber', formNumber)
        .input('agencyId', agencyId)
        .input('grantYear', body.grant_year || null)
        .input('poNumber', body.po_number || null)
        .input('vendorName', body.vendor_name || null)
        .input('vendorContact', body.vendor_contact || null)
        .input('invoiceNumber', body.invoice_number || null)
        .input('receivedDate', body.received_date || null)
        .input('receivedByName', body.received_by_name || null)
        .input('receivedByTitle', body.received_by_title || null)
        .input('receivingLocation', body.receiving_location || null)
        .input('discrepancies', body.discrepancies || null)
        .input('notes', body.notes || null)
        .input('status', submitNow ? 'submitted' : 'draft')
        .input('createdById', user.azureAdObjectId)
        .input('createdByName', user.name)
        .query(`
          INSERT INTO inventory_control_forms
            (id, form_number, agency_id, grant_year, po_number, vendor_name, vendor_contact,
             invoice_number, received_date, received_by_name, received_by_title, receiving_location,
             discrepancies, notes, status, created_by_id, created_by_name,
             submitted_at)
          VALUES
            (@id, @formNumber, @agencyId, @grantYear, @poNumber, @vendorName, @vendorContact,
             @invoiceNumber, @receivedDate, @receivedByName, @receivedByTitle, @receivingLocation,
             @discrepancies, @notes, @status, @createdById, @createdByName,
             ${submitNow ? 'GETUTCDATE()' : 'NULL'})
        `);

      // Insert line items
      const items: any[] = body.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pool.request()
          .input('id', require('crypto').randomUUID())
          .input('formId', newId)
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

      context.log(`[createControlForm] created ${newId} by ${user.name}`);
      return { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: newId, form_number: formNumber }) };
    } catch (err: any) {
      context.error('[createControlForm]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});
