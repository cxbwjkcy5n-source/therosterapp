import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface CreateNoteBody {
  person_id: string;
  content: string;
  created_at?: string;
}

interface CreateReminderBody {
  person_id: string;
  text: string;
  remind_at: string;
}

export function registerNotesRemindersRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // ========== Notes Endpoints ==========

  // GET /api/notes - List all notes for a person
  app.fastify.get(
    '/api/notes',
    {
      schema: {
        description: 'Get all notes for a specific person',
        tags: ['notes'],
        querystring: {
          type: 'object',
          required: ['person_id'],
          properties: {
            person_id: { type: 'string', format: 'uuid', description: 'Person ID' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                userId: { type: 'string' },
                personId: { type: 'string', format: 'uuid' },
                content: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id } = request.query;

      if (!person_id) {
        return reply.status(400).send({ error: 'person_id is required' });
      }

      app.logger.info({ userId: session.user.id, personId: person_id }, 'Getting notes');

      const notes = await app.db.query.notes.findMany({
        where: and(
          eq(schema.notes.userId, session.user.id),
          eq(schema.notes.personId, person_id)
        ),
      });

      app.logger.info({ userId: session.user.id, personId: person_id, count: notes.length }, 'Notes retrieved');
      return notes;
    }
  );

  // POST /api/notes - Create a note
  app.fastify.post(
    '/api/notes',
    {
      schema: {
        description: 'Create a note for a person',
        tags: ['notes'],
        body: {
          type: 'object',
          required: ['person_id', 'content'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            created_at: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              personId: { type: 'string', format: 'uuid' },
              content: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateNoteBody }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id, body: request.body }, 'Creating note');

      const [note] = await app.db
        .insert(schema.notes)
        .values({
          userId: session.user.id,
          personId: request.body.person_id,
          content: request.body.content,
          createdAt: request.body.created_at ? new Date(request.body.created_at) : new Date(),
        })
        .returning();

      app.logger.info({ userId: session.user.id, noteId: note.id }, 'Note created');
      reply.status(201);
      return note;
    }
  );

  // DELETE /api/notes/:id - Delete a note
  app.fastify.delete(
    '/api/notes/:id',
    {
      schema: {
        description: 'Delete a note',
        tags: ['notes'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info({ userId: session.user.id, noteId: id }, 'Deleting note');

      const note = await app.db.query.notes.findFirst({
        where: eq(schema.notes.id, id),
      });

      if (!note) {
        app.logger.warn({ userId: session.user.id, noteId: id }, 'Note not found');
        return reply.status(404).send({ error: 'Note not found' });
      }

      if (note.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, noteId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      await app.db.delete(schema.notes).where(eq(schema.notes.id, id));

      app.logger.info({ userId: session.user.id, noteId: id }, 'Note deleted');
      return reply.status(204).send();
    }
  );

  // ========== Reminders Endpoints ==========

  // GET /api/reminders - List all reminders for a person
  app.fastify.get(
    '/api/reminders',
    {
      schema: {
        description: 'Get all reminders for a specific person',
        tags: ['reminders'],
        querystring: {
          type: 'object',
          required: ['person_id'],
          properties: {
            person_id: { type: 'string', format: 'uuid', description: 'Person ID' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                userId: { type: 'string' },
                personId: { type: 'string', format: 'uuid' },
                text: { type: 'string' },
                remindAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id } = request.query;

      if (!person_id) {
        return reply.status(400).send({ error: 'person_id is required' });
      }

      app.logger.info({ userId: session.user.id, personId: person_id }, 'Getting reminders');

      const reminders = await app.db.query.reminders.findMany({
        where: and(
          eq(schema.reminders.userId, session.user.id),
          eq(schema.reminders.personId, person_id)
        ),
      });

      app.logger.info(
        { userId: session.user.id, personId: person_id, count: reminders.length },
        'Reminders retrieved'
      );
      return reminders;
    }
  );

  // POST /api/reminders - Create a reminder
  app.fastify.post(
    '/api/reminders',
    {
      schema: {
        description: 'Create a reminder for a person',
        tags: ['reminders'],
        body: {
          type: 'object',
          required: ['person_id', 'text', 'remind_at'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            text: { type: 'string' },
            remind_at: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              personId: { type: 'string', format: 'uuid' },
              text: { type: 'string' },
              remindAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateReminderBody }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id, body: request.body }, 'Creating reminder');

      const [reminder] = await app.db
        .insert(schema.reminders)
        .values({
          userId: session.user.id,
          personId: request.body.person_id,
          text: request.body.text,
          remindAt: new Date(request.body.remind_at),
        })
        .returning();

      app.logger.info({ userId: session.user.id, reminderId: reminder.id }, 'Reminder created');
      reply.status(201);
      return reminder;
    }
  );

  // DELETE /api/reminders/:id - Delete a reminder
  app.fastify.delete(
    '/api/reminders/:id',
    {
      schema: {
        description: 'Delete a reminder',
        tags: ['reminders'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info({ userId: session.user.id, reminderId: id }, 'Deleting reminder');

      const reminder = await app.db.query.reminders.findFirst({
        where: eq(schema.reminders.id, id),
      });

      if (!reminder) {
        app.logger.warn({ userId: session.user.id, reminderId: id }, 'Reminder not found');
        return reply.status(404).send({ error: 'Reminder not found' });
      }

      if (reminder.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, reminderId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      await app.db.delete(schema.reminders).where(eq(schema.reminders.id, id));

      app.logger.info({ userId: session.user.id, reminderId: id }, 'Reminder deleted');
      return reply.status(204).send();
    }
  );
}
