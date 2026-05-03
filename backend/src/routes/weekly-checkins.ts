import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerWeeklyCheckinsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/weekly-checkins - Create a weekly checkin
  app.fastify.post(
    '/api/weekly-checkins',
    {
      schema: {
        description: 'Create a weekly checkin entry',
        tags: ['weekly-checkins'],
        body: {
          type: 'object',
          required: ['mood'],
          properties: {
            mood: { type: 'integer', minimum: 1, maximum: 10, description: 'Mood rating from 1-10' },
            most_excited_person: { type: ['string', 'null'], description: 'Most excited person person to connect with' },
            one_thing_to_change: { type: ['string', 'null'], description: 'One thing to change this week' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              checkin: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  mood: { type: 'integer' },
                  most_excited_person: { type: ['string', 'null'] },
                  one_thing_to_change: { type: ['string', 'null'] },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          mood: number;
          most_excited_person?: string;
          one_thing_to_change?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { mood, most_excited_person, one_thing_to_change } = request.body;

      // Validate mood is 1-10
      if (mood < 1 || mood > 10) {
        app.logger.warn({ userId: session.user.id, mood }, 'Invalid mood value');
        return reply.status(400).send({ error: 'Mood must be between 1 and 10' });
      }

      app.logger.info({ userId: session.user.id, mood }, 'Creating weekly checkin');

      const [checkin] = await app.db
        .insert(schema.weeklyCheckins)
        .values({
          userId: session.user.id,
          mood,
          mostExcitedPerson: most_excited_person,
          oneThingToChange: one_thing_to_change,
        })
        .returning();

      app.logger.info({ userId: session.user.id, checkinId: checkin.id }, 'Weekly checkin created');
      reply.status(201);
      return {
        checkin: {
          id: checkin.id,
          mood: checkin.mood,
          most_excited_person: checkin.mostExcitedPerson,
          one_thing_to_change: checkin.oneThingToChange,
          created_at: checkin.createdAt,
        },
      };
    }
  );

  // GET /api/weekly-checkins/latest - Get the latest checkin
  app.fastify.get(
    '/api/weekly-checkins/latest',
    {
      schema: {
        description: 'Get the most recent weekly checkin',
        tags: ['weekly-checkins'],
        response: {
          200: {
            type: 'object',
            properties: {
              checkin: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  mood: { type: 'integer' },
                  most_excited_person: { type: ['string', 'null'] },
                  one_thing_to_change: { type: ['string', 'null'] },
                  created_at: { type: 'string', format: 'date-time' },
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

      app.logger.info({ userId: session.user.id }, 'Getting latest weekly checkin');

      const checkin = await app.db.query.weeklyCheckins.findFirst({
        where: eq(schema.weeklyCheckins.userId, session.user.id),
        orderBy: desc(schema.weeklyCheckins.createdAt),
      });

      if (!checkin) {
        app.logger.info({ userId: session.user.id }, 'No weekly checkin found');
        return {
          checkin: null,
        };
      }

      app.logger.info({ userId: session.user.id, checkinId: checkin.id }, 'Latest weekly checkin retrieved');
      return {
        checkin: {
          id: checkin.id,
          mood: checkin.mood,
          most_excited_person: checkin.mostExcitedPerson,
          one_thing_to_change: checkin.oneThingToChange,
          created_at: checkin.createdAt,
        },
      };
    }
  );
}
