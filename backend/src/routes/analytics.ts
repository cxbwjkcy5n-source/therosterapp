import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, count, and, sql } from 'drizzle-orm';
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
              want_another_date_count: { type: 'integer' },
              completed_dates_count: { type: 'integer' },
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

      // Count completed dates where want_another_date = true
      const wantAnotherDateResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(and(eq(schema.dates.userId, session.user.id), eq(schema.dates.wantAnotherDate, true), eq(schema.dates.status, 'completed')));

      // Count completed dates
      const completedDatesResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(and(eq(schema.dates.userId, session.user.id), eq(schema.dates.status, 'completed')));

      const analytics = {
        total_active: activeResult[0]?.count || 0,
        total_benched: benchedResult[0]?.count || 0,
        total_dates: datesResult[0]?.count || 0,
        want_another_date_count: wantAnotherDateResult[0]?.count || 0,
        completed_dates_count: completedDatesResult[0]?.count || 0,
      };

      app.logger.info({ userId: session.user.id, analytics }, 'Analytics computed successfully');

      return analytics;
    }
  );
}
