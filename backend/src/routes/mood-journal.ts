import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerMoodJournalRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/mood-journal
  app.fastify.get(
    '/api/mood-journal',
    {
      schema: {
        description: 'Get recent mood journal entries (last 30)',
        tags: ['mood-journal'],
        response: {
          200: {
            type: 'object',
            properties: {
              entries: {
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

      app.logger.info({ userId: session.user.id }, 'Fetching mood journal entries');

      const entries = await app.db
        .select()
        .from(schema.moodJournal)
        .where(eq(schema.moodJournal.userId, session.user.id))
        .orderBy(desc(schema.moodJournal.createdAt))
        .limit(30);

      app.logger.info({ userId: session.user.id, count: entries.length }, 'Mood journal entries fetched');
      return { entries };
    }
  );

  // POST /api/mood-journal
  app.fastify.post(
    '/api/mood-journal',
    {
      schema: {
        description: 'Create a mood journal entry',
        tags: ['mood-journal'],
        body: {
          type: 'object',
          required: ['mood'],
          properties: {
            mood: { type: 'integer', minimum: 1, maximum: 10 },
            note: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              entry: { type: 'object' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { mood: number; note?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { mood, note } = request.body;

      // Validate mood
      if (!Number.isInteger(mood) || mood < 1 || mood > 10) {
        app.logger.warn({ userId: session.user.id, mood }, 'Invalid mood value');
        return reply.status(400).send({ error: 'Mood must be an integer between 1 and 10' });
      }

      app.logger.info({ userId: session.user.id, mood }, 'Creating mood journal entry');

      try {
        const [entry] = await app.db
          .insert(schema.moodJournal)
          .values({
            userId: session.user.id,
            mood,
            note: note || null,
          })
          .returning();

        app.logger.info({ userId: session.user.id, entryId: entry.id }, 'Mood journal entry created');
        reply.status(201);
        return { entry };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to create mood journal entry');
        throw error;
      }
    }
  );

  // DELETE /api/mood-journal/:id
  app.fastify.delete(
    '/api/mood-journal/:id',
    {
      schema: {
        description: 'Delete a mood journal entry',
        tags: ['mood-journal'],
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
      app.logger.info({ userId: session.user.id, entryId: id }, 'Deleting mood journal entry');

      const entry = await app.db.query.moodJournal.findFirst({
        where: eq(schema.moodJournal.id, id),
      });

      if (!entry) {
        app.logger.warn({ userId: session.user.id, entryId: id }, 'Entry not found');
        return reply.status(404).send({ error: 'Entry not found' });
      }

      if (entry.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, entryId: id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        await app.db.delete(schema.moodJournal).where(eq(schema.moodJournal.id, id));
        app.logger.info({ userId: session.user.id, entryId: id }, 'Mood journal entry deleted');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete mood journal entry');
        throw error;
      }
    }
  );
}
