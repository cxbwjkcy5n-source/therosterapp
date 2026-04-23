import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, count, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerAnalyticsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get(
    '/api/analytics',
    {
      schema: {
        description: 'Get analytics for the authenticated user',
        tags: ['analytics'],
        response: {
          200: {
            type: 'object',
            properties: {
              total_active: { type: 'integer' },
              total_benched: { type: 'integer' },
              total_dates: { type: 'integer' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching analytics');

      // Count active persons
      const activeResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, false)));

      // Count benched persons
      const benchedResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, true)));

      // Count dates
      const datesResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(eq(schema.dates.userId, session.user.id));

      const analytics = {
        total_active: activeResult[0]?.count || 0,
        total_benched: benchedResult[0]?.count || 0,
        total_dates: datesResult[0]?.count || 0,
      };

      app.logger.info({ userId: session.user.id, analytics }, 'Analytics computed successfully');

      return analytics;
    }
  );
}
