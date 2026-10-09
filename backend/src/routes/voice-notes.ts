import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerVoiceNoteRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/persons/:personId/voice-notes
  app.fastify.get(
    '/api/persons/:personId/voice-notes',
    {
      schema: {
        description: 'Get all voice notes for a person',
        tags: ['voice-notes'],
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
              voice_notes: {
                type: 'array',
                items: { type: 'object' },
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
      app.logger.info({ userId: session.user.id, personId }, 'Fetching voice notes');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      const voiceNotes = await app.db
        .select()
        .from(schema.voiceNotes)
        .where(and(eq(schema.voiceNotes.personId, personId), eq(schema.voiceNotes.userId, session.user.id)))
        .orderBy(desc(schema.voiceNotes.createdAt));

      app.logger.info({ userId: session.user.id, personId, count: voiceNotes.length }, 'Voice notes fetched');
      return { voice_notes: voiceNotes };
    }
  );

  // POST /api/persons/:personId/voice-notes
  app.fastify.post(
    '/api/persons/:personId/voice-notes',
    {
      schema: {
        description: 'Create a voice note for a person',
        tags: ['voice-notes'],
        params: {
          type: 'object',
          required: ['personId'],
          properties: {
            personId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['audio_url'],
          properties: {
            audio_url: { type: 'string' },
            transcript: { type: 'string' },
            duration_seconds: { type: 'integer' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              voice_note: { type: 'object' },
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
        Body: { audio_url: string; transcript?: string; duration_seconds?: number };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { personId } = request.params;
      const { audio_url, transcript, duration_seconds } = request.body;
      app.logger.info({ userId: session.user.id, personId }, 'Creating voice note');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      try {
        const [voiceNote] = await app.db
          .insert(schema.voiceNotes)
          .values({
            userId: session.user.id,
            personId,
            audioUrl: audio_url,
            transcript: transcript || null,
            durationSeconds: duration_seconds || null,
          })
          .returning();

        app.logger.info({ userId: session.user.id, voiceNoteId: voiceNote.id }, 'Voice note created');
        reply.status(201);
        return { voice_note: voiceNote };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to create voice note');
        throw error;
      }
    }
  );

  // DELETE /api/voice-notes/:id
  app.fastify.delete(
    '/api/voice-notes/:id',
    {
      schema: {
        description: 'Delete a voice note',
        tags: ['voice-notes'],
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
      app.logger.info({ userId: session.user.id, voiceNoteId: id }, 'Deleting voice note');

      const voiceNote = await app.db.query.voiceNotes.findFirst({
        where: eq(schema.voiceNotes.id, id),
      });

      if (!voiceNote) {
        app.logger.warn({ userId: session.user.id, voiceNoteId: id }, 'Voice note not found');
        return reply.status(404).send({ error: 'Voice note not found' });
      }

      if (voiceNote.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, voiceNoteId: id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        await app.db.delete(schema.voiceNotes).where(eq(schema.voiceNotes.id, id));
        app.logger.info({ userId: session.user.id, voiceNoteId: id }, 'Voice note deleted');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete voice note');
        throw error;
      }
    }
  );
}
