import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface InteractionInput {
  person_id: string;
  type: string;
  title: string;
  notes?: string;
  occurred_at?: string;
}

export function registerInteractionsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/interactions - List interactions for a person
  app.fastify.get(
    '/api/interactions',
    {
      schema: {
        description: 'List all interactions for a specific person',
        tags: ['interactions'],
        querystring: {
          type: 'object',
          required: ['person_id'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              interactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    personId: { type: 'string', format: 'uuid' },
                    type: { type: 'string' },
                    title: { type: 'string' },
                    notes: { type: ['string', 'null'] },
                    occurredAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { person_id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id } = request.query;

      if (!person_id) {
        app.logger.warn({ userId: session.user.id }, 'person_id query param missing');
        return reply.status(400).send({ error: 'person_id query parameter is required' });
      }

      app.logger.info({ userId: session.user.id, personId: person_id }, 'Listing interactions');

      const interactions = await app.db
        .select()
        .from(schema.interactions)
        .where(and(eq(schema.interactions.userId, session.user.id), eq(schema.interactions.personId, person_id)))
        .orderBy(desc(schema.interactions.occurredAt));

      app.logger.info({ userId: session.user.id, personId: person_id, count: interactions.length }, 'Listed interactions');
      return { interactions };
    }
  );

  // POST /api/interactions - Create an interaction
  app.fastify.post(
    '/api/interactions',
    {
      schema: {
        description: 'Create a new interaction record',
        tags: ['interactions'],
        body: {
          type: 'object',
          required: ['person_id', 'type', 'title'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['date', 'text', 'call', 'other'] },
            title: { type: 'string' },
            notes: { type: 'string' },
            occurred_at: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              interaction: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  personId: { type: 'string', format: 'uuid' },
                  type: { type: 'string' },
                  title: { type: 'string' },
                  notes: { type: ['string', 'null'] },
                  occurredAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: InteractionInput }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id, type, title, notes, occurred_at } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id, type }, 'Logging interaction');

      // Verify the person exists and belongs to the authenticated user
      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, person_id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Access denied to person');
        return reply.status(404).send({ error: 'Person not found' });
      }

      const [interaction] = await app.db
        .insert(schema.interactions)
        .values({
          userId: session.user.id,
          personId: person_id,
          type: type as any,
          title,
          notes: notes || null,
          occurredAt: occurred_at ? new Date(occurred_at) : new Date(),
        })
        .returning();

      app.logger.info({ userId: session.user.id, interactionId: interaction.id }, 'Interaction logged');
      reply.status(201);
      return { interaction };
    }
  );

  // DELETE /api/interactions/:id - Delete an interaction
  app.fastify.delete(
    '/api/interactions/:id',
    {
      schema: {
        description: 'Delete an interaction record',
        tags: ['interactions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            description: 'Interaction deleted successfully',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, interactionId: id }, 'Deleting interaction');

      const interaction = await app.db.query.interactions.findFirst({
        where: eq(schema.interactions.id, id),
      });

      if (!interaction) {
        app.logger.warn({ userId: session.user.id, interactionId: id }, 'Interaction not found');
        return reply.status(404).send({ error: 'Interaction not found' });
      }

      if (interaction.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, interactionId: id }, 'Access denied to interaction');
        return reply.status(404).send({ error: 'Interaction not found' });
      }

      await app.db.delete(schema.interactions).where(eq(schema.interactions.id, id));

      app.logger.info({ userId: session.user.id, interactionId: id }, 'Interaction deleted');
      reply.status(204);
    }
  );
}
