import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserFromToken, resolveAuthHeader } from '../shared/auth';
import { corsHeaders, withCors } from '../shared/cors';

app.http('getMe', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }

    const authHeader = resolveAuthHeader(req);
    context.log('[getMe] Auth header present:', !!authHeader);

    try {
      const user = await getUserFromToken(authHeader);
      context.log('[getMe] User result:', JSON.stringify(user));

      if (!user) {
        return {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized — user not found' }),
        };
      }

      return withCors(user);
    } catch (err: any) {
      context.error('[getMe] CRASH:', err.message, err.stack);
      return {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }
  },
});
