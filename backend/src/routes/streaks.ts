import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerStreaksRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/streaks/me - Get current user's streak
  app.fastify.get(
    '/api/streaks/me',
    {
      schema: {
        description: 'Get the current user\'s check-in streak',
        tags: ['streaks'],
        response: {
          200: {
            type: 'object',
            properties: {
              streak: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  currentStreak: { type: 'integer' },
                  longestStreak: { type: 'integer' },
                  lastCheckinAt: { type: ['string', 'null'], format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting streak info');

      const streak = await app.db.query.streaks.findFirst({
        where: eq(schema.streaks.userId, session.user.id),
      });

      if (!streak) {
        app.logger.info({ userId: session.user.id }, 'No streak found, creating default');
        return {
          streak: {
            id: '',
            userId: session.user.id,
            currentStreak: 0,
            longestStreak: 0,
            lastCheckinAt: null,
            updatedAt: new Date().toISOString(),
          },
        };
      }

      app.logger.info({ userId: session.user.id, currentStreak: streak.currentStreak, longestStreak: streak.longestStreak }, 'Streak retrieved');
      return {
        streak: {
          id: streak.id,
          userId: streak.userId,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastCheckinAt: streak.lastCheckinAt,
          updatedAt: streak.updatedAt,
        },
      };
    }
  );
}
