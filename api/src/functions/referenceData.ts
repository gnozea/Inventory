import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { corsHeaders, withCors } from '../shared/cors';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { getPool } from '../shared/db';

app.http('getReferenceData', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reference-data',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    try {
      const pool = await getPool();
      const request = pool.request();
      let query = 'SELECT * FROM reference_data WHERE active = 1';
      const type = req.query.get('type');
      if (type) { query += ' AND type = @type'; request.input('type', type); }
      query += ' ORDER BY type, sort_order, name';
      const result = await request.query(query);
      return withCors({ value: result.recordset });
    } catch (err: any) {
      context.error('[getReferenceData]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});

app.http('createReferenceData', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reference-data',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (user.role !== 'SystemAdmin') return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only SystemAdmin' }) };
    try {
      const body = await req.json() as any;
      if (!body.type || !body.name) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'type and name required' }) };
      if (!['category', 'status'].includes(body.type)) return { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'type must be category or status' }) };
      const pool = await getPool();
      const maxOrder = await pool.request().input('type', body.type).query('SELECT ISNULL(MAX(sort_order), 0) + 1 as next_order FROM reference_data WHERE type = @type');
      const result = await pool.request()
        .input('type', body.type).input('name', body.name).input('desc', body.description || null).input('order', maxOrder.recordset[0].next_order)
        .query(`INSERT INTO reference_data (id, type, name, description, sort_order, active, created_at) OUTPUT INSERTED.* VALUES (NEWID(), @type, @name, @desc, @order, 1, GETUTCDATE())`);
      return withCors(result.recordset[0], 201);
    } catch (err: any) {
      context.error('[createReferenceData]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});

app.http('deleteReferenceData', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'reference-data/{id}',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') return { status: 204, headers: corsHeaders };
    const user = await getUserFromToken(resolveAuthHeader(req));
    if (!user) return { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    if (user.role !== 'SystemAdmin') return { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only SystemAdmin' }) };
    try {
      const id = req.params.id;
      const pool = await getPool();
      const result = await pool.request().input('id', id).query('UPDATE reference_data SET active = 0 OUTPUT INSERTED.* WHERE id = @id');
      if (!result.recordset[0]) return { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
      return withCors({ deleted: true, id });
    } catch (err: any) {
      context.error('[deleteReferenceData]', err.message);
      return { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  },
});