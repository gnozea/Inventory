import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('createAgency', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'agencies',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(req.headers.get('authorization'));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (user.role !== 'SystemAdmin') return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only SystemAdmin can create agencies' }) };
    try {
      const body = await req.json() as any;
      if (!body.name) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Agency name is required' }) };
      const pool = await getPool();
      const result = await pool.request()
        .input('name', body.name).input('type', body.type || null).input('region', body.region || null).input('contact_email', body.contact_email || null)
        .query(`INSERT INTO agencies (id, name, type, region, contact_email, created_at) OUTPUT INSERTED.* VALUES (NEWID(), @name, @type, @region, @contact_email, GETUTCDATE())`);
      return withCors(result.recordset[0], 201);
    } catch (err: any) {
      context.error('[createAgency]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});