import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerDatingGoalRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/dating-goals
  app.fastify.get(
    '/api/dating-goals',
    {
      schema: {
        description: 'Get all dating goals for the user',
        tags: ['dating-goals'],
        response: {
          200: {
            type: 'object',
            properties: {
              goals: {
                type: 'array',
                items: { type: 'object' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching dating goals');

      const goals = await app.db
        .select()
        .from(schema.datingGoals)
        .where(eq(schema.datingGoals.userId, session.user.id));

      app.logger.info({ userId: session.user.id, count: goals.length }, 'Dating goals fetched');
      return { goals };
    }
  );

  // POST /api/dating-goals
  app.fastify.post(
    '/api/dating-goals',
    {
      schema: {
        description: 'Create a dating goal',
        tags: ['dating-goals'],
        body: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            target_date: { type: 'string', format: 'date-time' },
            person_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              goal: { type: 'object' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { title: string; target_date?: string; person_id?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { title, target_date, person_id } = request.body;
      app.logger.info({ userId: session.user.id, title }, 'Creating dating goal');

      try {
        const [goal] = await app.db
          .insert(schema.datingGoals)
          .values({
            userId: session.user.id,
            title,
            targetDate: target_date ? new Date(target_date) : null,
            personId: person_id || null,
          })
          .returning();

        app.logger.info({ userId: session.user.id, goalId: goal.id }, 'Dating goal created');
        reply.status(201);
        return { goal };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to create dating goal');
        throw error;
      }
    }
  );

  // PATCH /api/dating-goals/:id
  app.fastify.patch(
    '/api/dating-goals/:id',
    {
      schema: {
        description: 'Update a dating goal',
        tags: ['dating-goals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            completed: { type: 'boolean' },
            title: { type: 'string' },
            target_date: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              goal: { type: 'object' },
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
        Params: { id: string };
        Body: { completed?: boolean; title?: string; target_date?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { completed, title, target_date } = request.body;
      app.logger.info({ userId: session.user.id, goalId: id }, 'Updating dating goal');

      const goal = await app.db.query.datingGoals.findFirst({
        where: eq(schema.datingGoals.id, id),
      });

      if (!goal) {
        app.logger.warn({ userId: session.user.id, goalId: id }, 'Goal not found');
        return reply.status(404).send({ error: 'Goal not found' });
      }

      if (goal.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, goalId: id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (target_date !== undefined) updateData.targetDate = new Date(target_date);
        if (completed !== undefined) {
          updateData.completed = completed;
          updateData.completedAt = completed ? new Date() : null;
        }

        const [updated] = await app.db
          .update(schema.datingGoals)
          .set(updateData)
          .where(eq(schema.datingGoals.id, id))
          .returning();

        app.logger.info({ userId: session.user.id, goalId: id }, 'Dating goal updated');
        return { goal: updated };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to update dating goal');
        throw error;
      }
    }
  );

  // DELETE /api/dating-goals/:id
  app.fastify.delete(
    '/api/dating-goals/:id',
    {
      schema: {
        description: 'Delete a dating goal',
        tags: ['dating-goals'],
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
      app.logger.info({ userId: session.user.id, goalId: id }, 'Deleting dating goal');

      const goal = await app.db.query.datingGoals.findFirst({
        where: eq(schema.datingGoals.id, id),
      });

      if (!goal) {
        app.logger.warn({ userId: session.user.id, goalId: id }, 'Goal not found');
        return reply.status(404).send({ error: 'Goal not found' });
      }

      if (goal.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, goalId: id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        await app.db.delete(schema.datingGoals).where(eq(schema.datingGoals.id, id));
        app.logger.info({ userId: session.user.id, goalId: id }, 'Dating goal deleted');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete dating goal');
        throw error;
      }
    }
  );
}
