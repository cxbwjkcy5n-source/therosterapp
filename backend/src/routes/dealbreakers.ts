import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerDealBreakerRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/deal-breakers
  app.fastify.get(
    '/api/deal-breakers',
    {
      schema: {
        description: 'Get all deal breakers for the user',
        tags: ['deal-breakers'],
        response: {
          200: {
            type: 'object',
            properties: {
              deal_breakers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    label: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
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

      app.logger.info({ userId: session.user.id }, 'Fetching deal breakers');

      const dealBreakers = await app.db
        .select()
        .from(schema.dealBreakers)
        .where(eq(schema.dealBreakers.userId, session.user.id));

      app.logger.info({ userId: session.user.id, count: dealBreakers.length }, 'Deal breakers fetched');
      return { deal_breakers: dealBreakers };
    }
  );

  // POST /api/deal-breakers
  app.fastify.post(
    '/api/deal-breakers',
    {
      schema: {
        description: 'Create a deal breaker',
        tags: ['deal-breakers'],
        body: {
          type: 'object',
          required: ['label'],
          properties: {
            label: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              deal_breaker: { type: 'object' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { label: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { label } = request.body;
      app.logger.info({ userId: session.user.id, label }, 'Creating deal breaker');

      try {
        const [dealBreaker] = await app.db
          .insert(schema.dealBreakers)
          .values({
            userId: session.user.id,
            label,
          })
          .returning();

        app.logger.info({ userId: session.user.id, dealBreakerId: dealBreaker.id }, 'Deal breaker created');
        reply.status(201);
        return { deal_breaker: dealBreaker };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to create deal breaker');
        throw error;
      }
    }
  );

  // DELETE /api/deal-breakers/:id
  app.fastify.delete(
    '/api/deal-breakers/:id',
    {
      schema: {
        description: 'Delete a deal breaker',
        tags: ['deal-breakers'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, dealBreakerId: id }, 'Deleting deal breaker');

      const dealBreaker = await app.db.query.dealBreakers.findFirst({
        where: eq(schema.dealBreakers.id, id),
      });

      if (!dealBreaker) {
        app.logger.warn({ userId: session.user.id, dealBreakerId: id }, 'Deal breaker not found');
        return reply.status(404).send({ error: 'Deal breaker not found' });
      }

      if (dealBreaker.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, dealBreakerId: id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        await app.db.delete(schema.dealBreakers).where(eq(schema.dealBreakers.id, id));
        app.logger.info({ userId: session.user.id, dealBreakerId: id }, 'Deal breaker deleted');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete deal breaker');
        throw error;
      }
    }
  );

  // GET /api/persons/deal-breaker-flags
  app.fastify.get(
    '/api/persons/deal-breaker-flags',
    {
      schema: {
        description: 'Get persons with deal breaker matches',
        tags: ['deal-breakers'],
        response: {
          200: {
            type: 'object',
            properties: {
              flags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    person_id: { type: 'string' },
                    person_name: { type: 'string' },
                    matched_deal_breakers: { type: 'array', items: { type: 'string' } },
                  },
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

      app.logger.info({ userId: session.user.id }, 'Fetching deal breaker flags');

      // Get active persons
      const persons = await app.db
        .select()
        .from(schema.persons)
        .where(and(
          eq(schema.persons.userId, session.user.id),
          eq(schema.persons.isBenched, false),
          isNull(schema.persons.archivedAt)
        ));

      // Get deal breakers
      const dealBreakers = await app.db
        .select()
        .from(schema.dealBreakers)
        .where(eq(schema.dealBreakers.userId, session.user.id));

      const flags: Array<{ person_id: string; person_name: string; matched_deal_breakers: string[] }> = [];

      // Check each person's red flags against deal breakers
      for (const person of persons) {
        if (!person.redFlags || person.redFlags.length === 0) continue;

        const matched: Set<string> = new Set();

        for (const redFlag of person.redFlags) {
          for (const dealBreaker of dealBreakers) {
            const redFlagLower = redFlag.toLowerCase();
            const labelLower = dealBreaker.label.toLowerCase();

            // Case-insensitive substring match
            if (redFlagLower.includes(labelLower) || labelLower.includes(redFlagLower)) {
              matched.add(dealBreaker.label);
            }
          }
        }

        if (matched.size > 0) {
          flags.push({
            person_id: person.id,
            person_name: person.name,
            matched_deal_breakers: Array.from(matched),
          });
        }
      }

      app.logger.info({ userId: session.user.id, flagCount: flags.length }, 'Deal breaker flags fetched');
      return { flags };
    }
  );
}
