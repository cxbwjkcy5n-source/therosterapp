import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, count, and, sql, gte, lt, between } from 'drizzle-orm';
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

  // GET /api/analytics/weekly-summary - Get weekly summary
  app.fastify.get(
    '/api/analytics/weekly-summary',
    {
      schema: {
        description: 'Get weekly summary for the authenticated user',
        tags: ['analytics'],
        response: {
          200: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  this_week_dates: { type: 'integer' },
                  last_week_dates: { type: 'integer' },
                  this_week_persons_added: { type: 'integer' },
                  last_week_persons_added: { type: 'integer' },
                  this_week_notes: { type: 'integer' },
                  last_week_notes: { type: 'integer' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching weekly summary');

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Count this week dates (date_time within last 7 days, handling text casting)
      const thisWeekDatesResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(
          and(
            eq(schema.dates.userId, session.user.id),
            sql`${schema.dates.dateTime}::TIMESTAMPTZ >= ${sevenDaysAgo.toISOString()}`,
            sql`${schema.dates.dateTime}::TIMESTAMPTZ <= ${now.toISOString()}`
          )
        );

      // Count last week dates (7-14 days ago)
      const lastWeekDatesResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(
          and(
            eq(schema.dates.userId, session.user.id),
            sql`${schema.dates.dateTime}::TIMESTAMPTZ >= ${fourteenDaysAgo.toISOString()}`,
            sql`${schema.dates.dateTime}::TIMESTAMPTZ < ${sevenDaysAgo.toISOString()}`
          )
        );

      // Count this week persons added
      const thisWeekPersonsResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(
          and(
            eq(schema.persons.userId, session.user.id),
            gte(schema.persons.createdAt, sevenDaysAgo)
          )
        );

      // Count last week persons added
      const lastWeekPersonsResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(
          and(
            eq(schema.persons.userId, session.user.id),
            between(schema.persons.createdAt, fourteenDaysAgo, sevenDaysAgo)
          )
        );

      // Count this week notes
      const thisWeekNotesResult = await app.db
        .select({ count: count() })
        .from(schema.notes)
        .where(
          and(
            eq(schema.notes.userId, session.user.id),
            gte(schema.notes.createdAt, sevenDaysAgo)
          )
        );

      // Count last week notes
      const lastWeekNotesResult = await app.db
        .select({ count: count() })
        .from(schema.notes)
        .where(
          and(
            eq(schema.notes.userId, session.user.id),
            between(schema.notes.createdAt, fourteenDaysAgo, sevenDaysAgo)
          )
        );

      const summary = {
        this_week_dates: thisWeekDatesResult[0]?.count || 0,
        last_week_dates: lastWeekDatesResult[0]?.count || 0,
        this_week_persons_added: thisWeekPersonsResult[0]?.count || 0,
        last_week_persons_added: lastWeekPersonsResult[0]?.count || 0,
        this_week_notes: thisWeekNotesResult[0]?.count || 0,
        last_week_notes: lastWeekNotesResult[0]?.count || 0,
      };

      app.logger.info({ userId: session.user.id, summary }, 'Weekly summary computed');
      return { summary };
    }
  );
}
