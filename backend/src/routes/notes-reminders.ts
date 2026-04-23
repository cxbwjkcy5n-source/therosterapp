import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gt, gte, lte, ne, isNotNull, or, sql, max } from 'drizzle-orm';
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
            type: 'object',
            properties: {
              notes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    personId: { type: 'string', format: 'uuid' },
                    content: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
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

      // Verify the person belongs to the authenticated user
      const person = await app.db.query.persons.findFirst({
        where: and(
          eq(schema.persons.id, person_id),
          eq(schema.persons.userId, session.user.id)
        ),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found or access denied');
        return reply.status(404).send({ error: 'Person not found' });
      }

      const notes = await app.db.query.notes.findMany({
        where: and(
          eq(schema.notes.userId, session.user.id),
          eq(schema.notes.personId, person_id)
        ),
        orderBy: (notes, { desc }) => [desc(notes.createdAt)],
      });

      app.logger.info({ userId: session.user.id, personId: person_id, count: notes.length }, 'Notes retrieved');
      return { notes };
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
              note: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  personId: { type: 'string', format: 'uuid' },
                  content: { type: 'string' },
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
    async (request: FastifyRequest<{ Body: CreateNoteBody }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id, content } = request.body;

      // Validate content is provided and non-empty
      if (!content || content.trim() === '') {
        app.logger.warn({ userId: session.user.id }, 'Content is required and cannot be empty');
        return reply.status(400).send({ error: 'Content is required and cannot be empty' });
      }

      app.logger.info({ userId: session.user.id, body: request.body }, 'Creating note');

      // Verify person exists and belongs to authenticated user
      const person = await app.db.query.persons.findFirst({
        where: and(
          eq(schema.persons.id, person_id),
          eq(schema.persons.userId, session.user.id)
        ),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found or access denied');
        return reply.status(404).send({ error: 'Person not found' });
      }

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
      return { note: {
        id: note.id,
        personId: note.personId,
        content: note.content,
        createdAt: note.createdAt,
      }};
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

  // GET /api/reminders/feed - Get upcoming dates and nudges
  app.fastify.get(
    '/api/reminders/feed',
    {
      schema: {
        description: 'Get upcoming dates and nudge suggestions',
        tags: ['reminders'],
        response: {
          200: {
            type: 'object',
            properties: {
              upcoming_dates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    date_time: { type: 'string', format: 'date-time' },
                    location: { type: ['string', 'null'] },
                    person_name: { type: 'string' },
                    person_photo_url: { type: ['string', 'null'] },
                  },
                },
              },
              nudges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    person_id: { type: 'string', format: 'uuid' },
                    person_name: { type: 'string' },
                    person_photo_url: { type: ['string', 'null'] },
                    interest_level: { type: ['integer', 'null'] },
                    days_since_contact: { type: 'integer' },
                    message: { type: 'string' },
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

      const userId = session.user.id;
      app.logger.info({ userId }, 'Getting reminders feed');

      try {
        // Get upcoming dates (next 30 days, in the future, not completed/cancelled)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const upcomingDates = await app.db
          .select({
            id: schema.dates.id,
            title: schema.dates.title,
            date_time: schema.dates.dateTime,
            location: schema.dates.location,
            person_name: schema.persons.name,
            person_photo_url: schema.persons.photoUrl,
          })
          .from(schema.dates)
          .innerJoin(schema.persons, eq(schema.dates.personId, schema.persons.id))
          .where(
            and(
              eq(schema.dates.userId, userId),
              isNotNull(schema.dates.dateTime),
              gt(schema.dates.dateTime, now.toISOString()),
              lte(schema.dates.dateTime, thirtyDaysFromNow.toISOString()),
              ne(schema.dates.status, 'completed'),
              ne(schema.dates.status, 'cancelled')
            )
          )
          .orderBy(schema.dates.dateTime);

        // Get all active persons with interest_level >= 6
        const activePersons = await app.db
          .select({
            id: schema.persons.id,
            name: schema.persons.name,
            photoUrl: schema.persons.photoUrl,
            interestLevel: schema.persons.interestLevel,
          })
          .from(schema.persons)
          .where(
            and(
              eq(schema.persons.userId, userId),
              eq(schema.persons.isBenched, false),
              isNotNull(schema.persons.interestLevel),
              gte(schema.persons.interestLevel, 6)
            )
          );

        // Get nudges for active persons
        const nudges = [];
        for (const person of activePersons) {
          // Get most recent date for this person
          const recentDate = await app.db
            .select({ dateTime: max(schema.dates.dateTime) })
            .from(schema.dates)
            .where(eq(schema.dates.personId, person.id));

          // Get most recent interaction for this person
          const recentInteraction = await app.db
            .select({ occurredAt: max(schema.interactions.occurredAt) })
            .from(schema.interactions)
            .where(eq(schema.interactions.personId, person.id));

          const lastDatetime = recentDate[0]?.dateTime ? new Date(recentDate[0].dateTime) : null;
          const lastInteractionTime = recentInteraction[0]?.occurredAt ? new Date(recentInteraction[0].occurredAt) : null;

          // Determine last_contact
          let lastContact: Date | null = null;
          if (lastDatetime && lastInteractionTime) {
            lastContact = lastDatetime > lastInteractionTime ? lastDatetime : lastInteractionTime;
          } else if (lastDatetime) {
            lastContact = lastDatetime;
          } else if (lastInteractionTime) {
            lastContact = lastInteractionTime;
          }

          // Check if should be included as nudge
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          const shouldInclude = lastContact === null || lastContact < fourteenDaysAgo;

          if (shouldInclude) {
            let daysSinceContact: number;
            let message: string;

            if (lastContact === null) {
              daysSinceContact = 9999;
              message = `You've never had a date or interaction with ${person.name} — time to make a move!`;
            } else {
              const daysDiff = Math.floor((now.getTime() - lastContact.getTime()) / (24 * 60 * 60 * 1000));
              daysSinceContact = daysDiff;
              message = `You haven't reached out to ${person.name} in ${daysDiff} days — they're a ${person.interestLevel}/10 match!`;
            }

            nudges.push({
              person_id: person.id,
              person_name: person.name,
              person_photo_url: person.photoUrl,
              interest_level: person.interestLevel,
              days_since_contact: daysSinceContact,
              message,
            });
          }
        }

        // Sort nudges by days_since_contact descending (least recent first)
        nudges.sort((a, b) => b.days_since_contact - a.days_since_contact);

        app.logger.info({ userId, upcoming_dates_count: upcomingDates.length, nudges_count: nudges.length }, 'Feed retrieved');
        return {
          upcoming_dates: upcomingDates,
          nudges,
        };
      } catch (error) {
        app.logger.error({ userId, err: error }, 'Error getting reminders feed');
        throw error;
      }
    }
  );
}
