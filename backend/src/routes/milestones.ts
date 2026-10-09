import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerMilestoneRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/persons/:personId/milestones
  app.fastify.get(
    '/api/persons/:personId/milestones',
    {
      schema: {
        description: 'Get all milestones for a person',
        tags: ['milestones'],
        params: {
          type: 'object',
          required: ['personId'],
          properties: {
            personId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              milestones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    personId: { type: 'string' },
                    type: { type: 'string' },
                    label: { type: 'string' },
                    occurredAt: { type: 'string', format: 'date-time' },
                    notes: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { personId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { personId } = request.params;
      app.logger.info({ userId: session.user.id, personId }, 'Fetching milestones');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      const milestones = await app.db
        .select()
        .from(schema.milestones)
        .where(and(eq(schema.milestones.personId, personId), eq(schema.milestones.userId, session.user.id)))
        .orderBy(desc(schema.milestones.occurredAt));

      app.logger.info({ userId: session.user.id, personId, count: milestones.length }, 'Milestones fetched');
      return { milestones };
    }
  );

  // POST /api/persons/:personId/milestones
  app.fastify.post(
    '/api/persons/:personId/milestones',
    {
      schema: {
        description: 'Create a milestone for a person',
        tags: ['milestones'],
        params: {
          type: 'object',
          required: ['personId'],
          properties: {
            personId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['type', 'label', 'occurred_at'],
          properties: {
            type: { type: 'string' },
            label: { type: 'string' },
            occurred_at: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              milestone: { type: 'object' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { personId: string };
        Body: { type: string; label: string; occurred_at: string; notes?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { personId } = request.params;
      const { type, label, occurred_at, notes } = request.body;
      app.logger.info({ userId: session.user.id, personId, type, label }, 'Creating milestone');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      try {
        const [milestone] = await app.db
          .insert(schema.milestones)
          .values({
            userId: session.user.id,
            personId,
            type,
            label,
            occurredAt: new Date(occurred_at),
            notes: notes || null,
          })
          .returning();

        app.logger.info({ userId: session.user.id, milestoneId: milestone.id }, 'Milestone created');
        reply.status(201);
        return { milestone };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId }, 'Failed to create milestone');
        throw error;
      }
    }
  );

  // DELETE /api/milestones/:id
  app.fastify.delete(
    '/api/milestones/:id',
    {
      schema: {
        description: 'Delete a milestone',
        tags: ['milestones'],
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
      app.logger.info({ userId: session.user.id, milestoneId: id }, 'Deleting milestone');

      const milestone = await app.db.query.milestones.findFirst({
        where: eq(schema.milestones.id, id),
      });

      if (!milestone) {
        app.logger.warn({ userId: session.user.id, milestoneId: id }, 'Milestone not found');
        return reply.status(404).send({ error: 'Milestone not found' });
      }

      if (milestone.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, milestoneId: id, ownerId: milestone.userId }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        await app.db.delete(schema.milestones).where(eq(schema.milestones.id, id));
        app.logger.info({ userId: session.user.id, milestoneId: id }, 'Milestone deleted');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, milestoneId: id }, 'Failed to delete milestone');
        throw error;
      }
    }
  );
}
