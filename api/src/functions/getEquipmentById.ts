import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getEquipmentById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'equipment/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) {
      return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
      const pool = await getPool();
      const result = await pool.request().input('id', req.params.id).query(`
        SELECT e.*,
               a.name AS agency_name,
               l.name AS location_name,
               l.address AS location_address,
               l.city AS location_city,
               l.county AS location_county,
               l.state AS location_state,
               l.zip_code AS location_zip_code,
               l.country AS location_country,
               l.latitude,
               l.longitude
        FROM equipment e
        LEFT JOIN agencies a ON e.agency_id = a.id
        LEFT JOIN locations l ON e.location_id = l.id
        WHERE e.id = @id
      `);

      const eq = result.recordset[0];
      if (!eq) {
        return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
      }

      const isGlobal = ['GlobalViewer', 'SystemAdmin'].includes(user.role);
      if (!isGlobal && eq.agency_id !== user.agencyId) {
        return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      return withCors(eq);
    } catch (err: any) {
      context.error('[getEquipmentById] Error:', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});