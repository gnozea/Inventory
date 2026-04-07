import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getAuditLog', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'audit-log',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (user.role !== 'SystemAdmin') return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only SystemAdmin' }) };
    try {
      const pool = await getPool();
      const limit = parseInt(req.query.get('limit') || '50', 10);
      const result = await pool.request().input('limit', Math.min(limit, 200)).query(`
        SELECT TOP (@limit) sl.id, sl.equipment_id, sl.old_status, sl.new_status, sl.notes, sl.changed_by, sl.created_at,
          e.name as equipment_name, e.serial_number, a.name as agency_name
        FROM status_log sl
        LEFT JOIN equipment e ON sl.equipment_id = e.id
        LEFT JOIN agencies a ON e.agency_id = a.id
        ORDER BY sl.created_at DESC
      `);
      return withCors({ value: result.recordset });
    } catch (err: any) {
      context.error('[getAuditLog]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});