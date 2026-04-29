import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface PreferencesResponse {
  notifications_enabled: boolean;
  dark_mode_enabled: boolean;
}

interface UpdatePreferencesBody {
  notifications_enabled?: boolean;
  dark_mode_enabled?: boolean;
}

export function registerPreferencesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/preferences - Retrieve user preferences
  app.fastify.get(
    '/api/preferences',
    {
      schema: {
        description: 'Get user notification and dark mode preferences',
        tags: ['preferences'],
        response: {
          200: {
            description: 'User preferences',
            type: 'object',
            properties: {
              notifications_enabled: { type: 'boolean' },
              dark_mode_enabled: { type: 'boolean' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<PreferencesResponse | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Getting user preferences');

      const prefs = await app.db
        .select()
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, userId));

      if (prefs.length === 0) {
        app.logger.info({ userId }, 'No preferences found, returning defaults');
        return {
          notifications_enabled: true,
          dark_mode_enabled: false,
        };
      }

      const pref = prefs[0];
      app.logger.info(
        {
          userId,
          notificationsEnabled: pref.notificationsEnabled,
          darkModeEnabled: pref.darkModeEnabled,
        },
        'Preferences retrieved successfully'
      );

      return {
        notifications_enabled: pref.notificationsEnabled,
        dark_mode_enabled: pref.darkModeEnabled,
      };
    }
  );

  // PUT /api/preferences - Update user preferences (upsert)
  app.fastify.put(
    '/api/preferences',
    {
      schema: {
        description: 'Update user notification and dark mode preferences',
        tags: ['preferences'],
        body: {
          type: 'object',
          properties: {
            notifications_enabled: { type: 'boolean' },
            dark_mode_enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Updated preferences',
            type: 'object',
            properties: {
              notifications_enabled: { type: 'boolean' },
              dark_mode_enabled: { type: 'boolean' },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
      reply: FastifyReply
    ): Promise<PreferencesResponse | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { notifications_enabled, dark_mode_enabled } = request.body;

      app.logger.info(
        {
          userId,
          notificationsEnabled: notifications_enabled,
          darkModeEnabled: dark_mode_enabled,
        },
        'Updating user preferences'
      );

      try {
        // Check if preferences exist
        const existing = await app.db
          .select()
          .from(schema.userPreferences)
          .where(eq(schema.userPreferences.userId, userId));

        let updated;

        if (existing.length === 0) {
          // Insert new preferences
          const insertData: any = {
            userId,
            notificationsEnabled:
              notifications_enabled !== undefined
                ? notifications_enabled
                : true,
            darkModeEnabled:
              dark_mode_enabled !== undefined ? dark_mode_enabled : false,
          };

          const inserted = await app.db
            .insert(schema.userPreferences)
            .values(insertData)
            .returning();

          updated = inserted[0];
        } else {
          // Update existing preferences
          const updateData: any = {
            updatedAt: new Date(),
          };

          if (notifications_enabled !== undefined) {
            updateData.notificationsEnabled = notifications_enabled;
          }
          if (dark_mode_enabled !== undefined) {
            updateData.darkModeEnabled = dark_mode_enabled;
          }

          const updatedRows = await app.db
            .update(schema.userPreferences)
            .set(updateData)
            .where(eq(schema.userPreferences.userId, userId))
            .returning();

          updated = updatedRows[0];
        }

        app.logger.info(
          {
            userId,
            notificationsEnabled: updated.notificationsEnabled,
            darkModeEnabled: updated.darkModeEnabled,
          },
          'Preferences updated successfully'
        );

        return {
          notifications_enabled: updated.notificationsEnabled,
          dark_mode_enabled: updated.darkModeEnabled,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, body: request.body },
          'Failed to update preferences'
        );
        throw error;
      }
    }
  );
}
