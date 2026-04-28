import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';

// Import route registration functions
import { registerPersonsRoutes } from './routes/persons.js';
import { registerDatesRoutes } from './routes/dates.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerAIRoutes } from './routes/ai.js';
import { registerStorageRoutes } from './routes/storage.js';
import { registerInteractionsRoutes } from './routes/interactions.js';
import { registerProfilesRoutes } from './routes/profiles.js';
import { registerPlacesRoutes } from './routes/places.js';
import { registerNotesRemindersRoutes } from './routes/notes-reminders.js';
import { registerSafetyCheckinsRoutes } from './routes/safety-checkins.js';
import { registerShareRoutes } from './routes/share.js';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with email/password and OAuth providers
app.withAuth();

// Enable file storage for uploads
app.withStorage();

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPersonsRoutes(app);
registerDatesRoutes(app);
registerAnalyticsRoutes(app);
registerAIRoutes(app);
registerStorageRoutes(app);
registerInteractionsRoutes(app);
registerProfilesRoutes(app);
registerPlacesRoutes(app);
registerNotesRemindersRoutes(app);
registerSafetyCheckinsRoutes(app);
registerShareRoutes(app);

await app.run();
app.logger.info('Application running');
