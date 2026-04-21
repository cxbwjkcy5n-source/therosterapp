import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface DateInput {
  person_id: string;
  title: string;
  location?: string;
  date_time?: string;
  budget?: string;
  status?: string;
  reminder_3_days?: boolean;
  reminder_1_day?: boolean;
  reminder_1_hour?: boolean;
  notes?: string;
}

export function registerDatesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/dates - List all dates for the user
  app.fastify.get(
    '/api/dates',
    {
      schema: {
        description: 'List all dates for the authenticated user with person info',
        tags: ['dates'],
        response: {
          200: {
            type: 'object',
            properties: {
              dates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    personId: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    location: { type: ['string', 'null'] },
                    dateTime: { type: ['string', 'null'] },
                    budget: { type: ['string', 'null'] },
                    status: { type: 'string' },
                    reminder3Days: { type: 'boolean' },
                    reminder1Day: { type: 'boolean' },
                    reminder1Hour: { type: 'boolean' },
                    notes: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    person: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        photoUrl: { type: ['string', 'null'] },
                      },
                    },
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

      app.logger.info({ userId: session.user.id }, 'Listing dates');

      const dates = await app.db
        .select({
          id: schema.dates.id,
          userId: schema.dates.userId,
          personId: schema.dates.personId,
          title: schema.dates.title,
          location: schema.dates.location,
          dateTime: schema.dates.dateTime,
          budget: schema.dates.budget,
          status: schema.dates.status,
          reminder3Days: schema.dates.reminder3Days,
          reminder1Day: schema.dates.reminder1Day,
          reminder1Hour: schema.dates.reminder1Hour,
          notes: schema.dates.notes,
          createdAt: schema.dates.createdAt,
          person: {
            id: schema.persons.id,
            name: schema.persons.name,
            photoUrl: schema.persons.photoUrl,
          },
        })
        .from(schema.dates)
        .leftJoin(schema.persons, eq(schema.dates.personId, schema.persons.id))
        .where(eq(schema.dates.userId, session.user.id));

      app.logger.info({ userId: session.user.id, count: dates.length }, 'Listed dates');
      return { dates };
    }
  );

  // POST /api/dates - Create a date
  app.fastify.post(
    '/api/dates',
    {
      schema: {
        description: 'Create a date entry for the authenticated user',
        tags: ['dates'],
        body: {
          type: 'object',
          required: ['person_id', 'title'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            location: { type: 'string' },
            date_time: { type: 'string' },
            budget: { type: 'string' },
            status: { type: 'string', enum: ['planned', 'confirmed', 'completed', 'cancelled'] },
            reminder_3_days: { type: 'boolean' },
            reminder_1_day: { type: 'boolean' },
            reminder_1_hour: { type: 'boolean' },
            notes: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: DateInput }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id, body: request.body }, 'Creating date');

      const insertData: any = {
        userId: session.user.id,
        personId: request.body.person_id,
        title: request.body.title,
      };

      // Add optional fields only if provided
      if (request.body.location !== undefined) insertData.location = request.body.location;
      if (request.body.date_time !== undefined) insertData.dateTime = request.body.date_time;
      if (request.body.budget !== undefined) insertData.budget = request.body.budget;
      if (request.body.notes !== undefined) insertData.notes = request.body.notes;
      if (request.body.reminder_3_days !== undefined) insertData.reminder3Days = request.body.reminder_3_days;
      if (request.body.reminder_1_day !== undefined) insertData.reminder1Day = request.body.reminder_1_day;
      if (request.body.reminder_1_hour !== undefined) insertData.reminder1Hour = request.body.reminder_1_hour;
      if (request.body.status !== undefined) insertData.status = request.body.status as any;

      const [dateEntry] = await app.db
        .insert(schema.dates)
        .values(insertData)
        .returning();

      // Fetch the person info
      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, request.body.person_id),
      });

      app.logger.info({ userId: session.user.id, dateId: dateEntry.id }, 'Date created');
      reply.status(201);
      return {
        ...dateEntry,
        person: person ? { id: person.id, name: person.name, photoUrl: person.photoUrl } : null,
      };
    }
  );

  // PUT /api/dates/:id - Update a date
  app.fastify.put(
    '/api/dates/:id',
    {
      schema: {
        description: 'Update a date entry',
        tags: ['dates'],
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
            person_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            location: { type: 'string' },
            date_time: { type: 'string' },
            budget: { type: 'string' },
            status: { type: 'string', enum: ['planned', 'confirmed', 'completed', 'cancelled'] },
            reminder_3_days: { type: 'boolean' },
            reminder_1_day: { type: 'boolean' },
            reminder_1_hour: { type: 'boolean' },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<DateInput> }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, dateId: id, body: request.body }, 'Updating date');

      const dateEntry = await app.db.query.dates.findFirst({
        where: eq(schema.dates.id, id),
      });

      if (!dateEntry) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Date not found');
        return reply.status(404).send({ error: 'Date not found' });
      }

      if (dateEntry.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      const updateData: any = {};
      if (request.body.person_id !== undefined) updateData.personId = request.body.person_id;
      if (request.body.title !== undefined) updateData.title = request.body.title;
      if (request.body.location !== undefined) updateData.location = request.body.location;
      if (request.body.date_time !== undefined) updateData.dateTime = request.body.date_time;
      if (request.body.budget !== undefined) updateData.budget = request.body.budget;
      if (request.body.notes !== undefined) updateData.notes = request.body.notes;
      if (request.body.reminder_3_days !== undefined) updateData.reminder3Days = request.body.reminder_3_days;
      if (request.body.reminder_1_day !== undefined) updateData.reminder1Day = request.body.reminder_1_day;
      if (request.body.reminder_1_hour !== undefined) updateData.reminder1Hour = request.body.reminder_1_hour;
      if (request.body.status !== undefined) updateData.status = request.body.status as any;

      const [updated] = await app.db
        .update(schema.dates)
        .set(updateData)
        .where(eq(schema.dates.id, id))
        .returning();

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, updated.personId),
      });

      app.logger.info({ userId: session.user.id, dateId: id }, 'Date updated');
      return {
        ...updated,
        person: person ? { id: person.id, name: person.name, photoUrl: person.photoUrl } : null,
      };
    }
  );

  // DELETE /api/dates/:id - Delete a date
  app.fastify.delete(
    '/api/dates/:id',
    {
      schema: {
        description: 'Delete a date entry',
        tags: ['dates'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
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
      app.logger.info({ userId: session.user.id, dateId: id }, 'Deleting date');

      const dateEntry = await app.db.query.dates.findFirst({
        where: eq(schema.dates.id, id),
      });

      if (!dateEntry) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Date not found');
        return reply.status(404).send({ error: 'Date not found' });
      }

      if (dateEntry.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      await app.db.delete(schema.dates).where(eq(schema.dates.id, id));

      app.logger.info({ userId: session.user.id, dateId: id }, 'Date deleted');
      return { success: true };
    }
  );
}
