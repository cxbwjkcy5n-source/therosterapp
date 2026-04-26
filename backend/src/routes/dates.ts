import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, notInArray, isNull, lt, sql } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface DateInput {
  person_id: string;
  title?: string;
  type?: string;
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
        description: 'List all dates for the authenticated user',
        tags: ['dates'],
        querystring: {
          type: 'object',
          properties: {
            person_id: { type: 'string', format: 'uuid', description: 'Filter by person ID' },
          },
        },
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
                    person_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    date_time: { type: ['string', 'null'] },
                    rating: { type: ['integer', 'null'] },
                    status: { type: 'string' },
                    location: { type: ['string', 'null'] },
                    notes: { type: ['string', 'null'] },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
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
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Listing dates');

      // Build where clause - always filter by user, optionally by person_id
      let whereClause = eq(schema.dates.userId, session.user.id);
      if (person_id) {
        whereClause = and(whereClause, eq(schema.dates.personId, person_id));
      }

      const datesData = await app.db
        .select({
          id: schema.dates.id,
          personId: schema.dates.personId,
          title: schema.dates.title,
          dateTime: schema.dates.dateTime,
          rating: schema.dates.rating,
          status: schema.dates.status,
          location: schema.dates.location,
          notes: schema.dates.notes,
          wentWell: schema.dates.wentWell,
          wentPoorly: schema.dates.wentPoorly,
          wantAnotherDate: schema.dates.wantAnotherDate,
          createdAt: schema.dates.createdAt,
        })
        .from(schema.dates)
        .where(whereClause)
        .orderBy(sql`${schema.dates.dateTime} DESC NULLS LAST`, sql`${schema.dates.createdAt} DESC`);

      // Convert camelCase to snake_case for response
      const dates = datesData.map((date) => ({
        id: date.id,
        person_id: date.personId,
        title: date.title,
        type: null,
        date_time: date.dateTime,
        rating: date.rating,
        status: date.status,
        location: date.location,
        notes: date.notes,
        went_well: date.wentWell,
        went_poorly: date.wentPoorly,
        want_another_date: date.wantAnotherDate,
        created_at: date.createdAt,
      }));

      app.logger.info({ userId: session.user.id, personId: person_id, count: dates.length }, 'Listed dates');
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
          required: ['person_id'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            type: { type: 'string' },
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

      // Auto-generate title if not provided
      const title = request.body.title ||
        (request.body.type
          ? request.body.type.charAt(0).toUpperCase() + request.body.type.slice(1) + ' Date'
          : 'Date');

      const insertData: any = {
        userId: session.user.id,
        personId: request.body.person_id,
        title,
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

  // PATCH /api/dates/:id/review - Update date with review
  app.fastify.patch(
    '/api/dates/:id/review',
    {
      schema: {
        description: 'Update a date with review information',
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
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            went_well: { type: 'string' },
            went_poorly: { type: 'string' },
            want_another_date: { type: 'boolean' },
            status: { type: 'string', enum: ['planned', 'confirmed', 'completed', 'cancelled'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              rating: { type: ['integer', 'null'] },
              went_well: { type: ['string', 'null'] },
              went_poorly: { type: ['string', 'null'] },
              want_another_date: { type: ['boolean', 'null'] },
              status: { type: 'string' },
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
        Body: {
          rating?: number;
          went_well?: string;
          went_poorly?: string;
          want_another_date?: boolean;
          status?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, dateId: id, body: request.body }, 'Updating date review');

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
      if (request.body.rating !== undefined) updateData.rating = request.body.rating;
      if (request.body.went_well !== undefined) updateData.wentWell = request.body.went_well;
      if (request.body.went_poorly !== undefined) updateData.wentPoorly = request.body.went_poorly;
      if (request.body.want_another_date !== undefined) updateData.wantAnotherDate = request.body.want_another_date;

      // Set status to completed if not already set and review is being added
      if (request.body.status !== undefined) {
        updateData.status = request.body.status as any;
      } else if (dateEntry.status !== 'completed' && dateEntry.status !== 'cancelled') {
        updateData.status = 'completed';
      }

      await app.db
        .update(schema.dates)
        .set(updateData)
        .where(eq(schema.dates.id, id));

      // Fetch the updated record to ensure all fields are returned
      const updatedDate = await app.db.query.dates.findFirst({
        where: eq(schema.dates.id, id),
      });

      app.logger.info({ userId: session.user.id, dateId: id }, 'Date review updated');

      // Convert camelCase to snake_case for response
      return {
        id: updatedDate?.id,
        title: updatedDate?.title,
        rating: updatedDate?.rating,
        went_well: updatedDate?.wentWell,
        went_poorly: updatedDate?.wentPoorly,
        want_another_date: updatedDate?.wantAnotherDate,
        status: updatedDate?.status,
      };
    }
  );

  // GET /api/dates/pending-review - List dates pending review
  app.fastify.get(
    '/api/dates/pending-review',
    {
      schema: {
        description: 'Get dates pending review for the authenticated user',
        tags: ['dates'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                status: { type: 'string' },
                dateTime: { type: ['string', 'null'] },
                rating: { type: ['integer', 'null'] },
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
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting dates pending review');

      // Query dates that are past their scheduled time, not completed/cancelled, and have no rating
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
          rating: schema.dates.rating,
          wentWell: schema.dates.wentWell,
          wentPoorly: schema.dates.wentPoorly,
          wantAnotherDate: schema.dates.wantAnotherDate,
          createdAt: schema.dates.createdAt,
          person: {
            id: schema.persons.id,
            name: schema.persons.name,
            photoUrl: schema.persons.photoUrl,
          },
        })
        .from(schema.dates)
        .leftJoin(schema.persons, eq(schema.dates.personId, schema.persons.id))
        .where(
          and(
            eq(schema.dates.userId, session.user.id),
            notInArray(schema.dates.status, ['completed', 'cancelled']),
            isNull(schema.dates.rating),
            lt(
              sql`cast(${schema.dates.dateTime} as timestamp)`,
              sql`now()`
            )
          )
        );

      app.logger.info({ userId: session.user.id, count: dates.length }, 'Retrieved pending review dates');
      return dates;
    }
  );

  // GET /api/dates/:id - Get a single date
  app.fastify.get(
    '/api/dates/:id',
    {
      schema: {
        description: 'Get a single date entry for the authenticated user',
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
              date: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  person_id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  type: { type: ['string', 'null'] },
                  date_time: { type: ['string', 'null'] },
                  location: { type: ['string', 'null'] },
                  notes: { type: ['string', 'null'] },
                  status: { type: 'string' },
                  rating: { type: ['integer', 'null'] },
                  went_well: { type: ['string', 'null'] },
                  went_poorly: { type: ['string', 'null'] },
                  want_another_date: { type: ['boolean', 'null'] },
                  created_at: { type: 'string', format: 'date-time' },
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, dateId: id }, 'Getting date');

      const date = await app.db.query.dates.findFirst({
        where: eq(schema.dates.id, id),
      });

      if (!date) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Date not found');
        return reply.status(404).send({ error: 'Date not found' });
      }

      if (date.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, dateId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      app.logger.info({ userId: session.user.id, dateId: id }, 'Date retrieved');
      return {
        date: {
          id: date.id,
          person_id: date.personId,
          title: date.title,
          type: null,
          date_time: date.dateTime,
          location: date.location,
          notes: date.notes,
          status: date.status,
          rating: date.rating,
          went_well: date.wentWell,
          went_poorly: date.wentPoorly,
          want_another_date: date.wantAnotherDate,
          created_at: date.createdAt,
        },
      };
    }
  );
}
