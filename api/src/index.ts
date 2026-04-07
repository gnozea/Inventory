import { app } from '@azure/functions';
import { corsHeaders } from './shared/cors';

// Handle OPTIONS preflight for all routes
app.http('optionsHandler', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*route}',
  handler: async () => ({
    status: 204,
    headers: corsHeaders,
  }),
});

import './functions/getMe';
import './functions/getEquipment';
import './functions/getEquipmentById';
import './functions/updateEquipmentStatus';
import './functions/getAgencies';
import './functions/getStatusLog';
import './functions/getReports';
import './functions/searchEquipment';
import './functions/getUsers';
import './functions/createUser';
import './functions/updateUser';
import './functions/createAgency';
import './functions/updateAgency';
import './functions/referenceData';
import './functions/getAuditLog';
