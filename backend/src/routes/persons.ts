import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface PersonInput {
  name: string;
  location: string;
  photoUrl?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  instagram?: string;
  tiktok?: string;
  twitterX?: string;
  interestLevel?: number;
  attractiveness?: number;
  sexualChemistry?: number;
  communication?: number;
  connectionType?: string;
  connectionTypeCustom?: string;
  favoriteFoods?: string[];
  hobbies?: string[];
  redFlags?: string[];
  greenFlags?: string[];
}

export function registerPersonsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/persons - List persons (active or benched based on query param)
  app.fastify.get(
    '/api/persons',
    {
      schema: {
        description: 'List persons for the authenticated user, filtered by benched status',
        tags: ['persons'],
        querystring: {
          type: 'object',
          properties: {
            benched: { type: 'string', enum: ['true', 'false'], description: 'Filter by benched status' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              persons: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    name: { type: 'string' },
                    location: { type: 'string' },
                    photoUrl: { type: ['string', 'null'] },
                    age: { type: ['integer', 'null'] },
                    birthday: { type: ['string', 'null'] },
                    zodiac: { type: ['string', 'null'] },
                    instagram: { type: ['string', 'null'] },
                    tiktok: { type: ['string', 'null'] },
                    twitterX: { type: ['string', 'null'] },
                    interestLevel: { type: ['integer', 'null'] },
                    attractiveness: { type: ['integer', 'null'] },
                    sexualChemistry: { type: ['integer', 'null'] },
                    communication: { type: ['integer', 'null'] },
                    connectionType: { type: ['string', 'null'] },
                    connectionTypeCustom: { type: ['string', 'null'] },
                    favoriteFoods: { type: ['array', 'null'], items: { type: 'string' } },
                    hobbies: { type: ['array', 'null'], items: { type: 'string' } },
                    redFlags: { type: ['array', 'null'], items: { type: 'string' } },
                    greenFlags: { type: ['array', 'null'], items: { type: 'string' } },
                    isBenched: { type: 'boolean' },
                    benchReason: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { benched?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { benched } = request.query;
      const isBenchedFilter = benched === 'true' ? true : false;

      app.logger.info({ userId: session.user.id, benched: isBenchedFilter }, 'Listing persons');

      const persons = await app.db
        .select()
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, isBenchedFilter)));

      app.logger.info({ userId: session.user.id, count: persons.length }, 'Listed persons');
      return { persons };
    }
  );

  // POST /api/persons - Create a person
  app.fastify.post(
    '/api/persons',
    {
      schema: {
        description: 'Create a new person for the authenticated user',
        tags: ['persons'],
        body: {
          type: 'object',
          required: ['name', 'location'],
          properties: {
            name: { type: 'string' },
            location: { type: 'string' },
            photoUrl: { type: 'string' },
            age: { type: 'integer' },
            birthday: { type: 'string' },
            zodiac: { type: 'string', enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] },
            instagram: { type: 'string' },
            tiktok: { type: 'string' },
            twitterX: { type: 'string' },
            interestLevel: { type: 'integer' },
            attractiveness: { type: 'integer' },
            sexualChemistry: { type: 'integer' },
            communication: { type: 'integer' },
            connectionType: { type: 'string', enum: ['friend', 'casual', 'booty_call', 'foodie_call', 'figuring_it_out', 'serious', 'other'] },
            connectionTypeCustom: { type: 'string' },
            favoriteFoods: { type: 'array', items: { type: 'string' } },
            hobbies: { type: 'array', items: { type: 'string' } },
            redFlags: { type: 'array', items: { type: 'string' } },
            greenFlags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              name: { type: 'string' },
              location: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: PersonInput }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id, body: request.body }, 'Creating person');

      const [person] = await app.db
        .insert(schema.persons)
        .values({
          userId: session.user.id,
          name: request.body.name,
          location: request.body.location,
          photoUrl: request.body.photoUrl,
          age: request.body.age,
          birthday: request.body.birthday,
          zodiac: request.body.zodiac as any,
          instagram: request.body.instagram,
          tiktok: request.body.tiktok,
          twitterX: request.body.twitterX,
          interestLevel: request.body.interestLevel,
          attractiveness: request.body.attractiveness,
          sexualChemistry: request.body.sexualChemistry,
          communication: request.body.communication,
          connectionType: request.body.connectionType as any,
          connectionTypeCustom: request.body.connectionTypeCustom,
          favoriteFoods: request.body.favoriteFoods,
          hobbies: request.body.hobbies,
          redFlags: request.body.redFlags,
          greenFlags: request.body.greenFlags,
        })
        .returning();

      app.logger.info({ userId: session.user.id, personId: person.id }, 'Person created');
      reply.status(201);
      return person;
    }
  );

  // GET /api/persons/:id - Get a single person
  app.fastify.get(
    '/api/persons/:id',
    {
      schema: {
        description: 'Get a single person by ID',
        tags: ['persons'],
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
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              name: { type: 'string' },
              location: { type: 'string' },
              photoUrl: { type: ['string', 'null'] },
              age: { type: ['integer', 'null'] },
              birthday: { type: ['string', 'null'] },
              zodiac: { type: ['string', 'null'] },
              instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] },
              twitterX: { type: ['string', 'null'] },
              interestLevel: { type: ['integer', 'null'] },
              attractiveness: { type: ['integer', 'null'] },
              sexualChemistry: { type: ['integer', 'null'] },
              communication: { type: ['integer', 'null'] },
              connectionType: { type: ['string', 'null'] },
              connectionTypeCustom: { type: ['string', 'null'] },
              favoriteFoods: { type: ['array', 'null'], items: { type: 'string' } },
              hobbies: { type: ['array', 'null'], items: { type: 'string' } },
              redFlags: { type: ['array', 'null'], items: { type: 'string' } },
              greenFlags: { type: ['array', 'null'], items: { type: 'string' } },
              isBenched: { type: 'boolean' },
              benchReason: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
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
      app.logger.info({ userId: session.user.id, personId: id }, 'Getting person');

      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found or access denied');
        return reply.status(404).send({ error: 'Person not found' });
      }

      app.logger.info({ userId: session.user.id, personId: id }, 'Person retrieved');
      return person;
    }
  );

  // PUT /api/persons/:id - Update a person
  app.fastify.put(
    '/api/persons/:id',
    {
      schema: {
        description: 'Update a person',
        tags: ['persons'],
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
            name: { type: 'string' },
            location: { type: 'string' },
            photoUrl: { type: 'string' },
            age: { type: 'integer' },
            birthday: { type: 'string' },
            zodiac: { type: 'string', enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] },
            instagram: { type: 'string' },
            tiktok: { type: 'string' },
            twitterX: { type: 'string' },
            interestLevel: { type: 'integer' },
            attractiveness: { type: 'integer' },
            sexualChemistry: { type: 'integer' },
            communication: { type: 'integer' },
            connectionType: { type: 'string', enum: ['friend', 'casual', 'booty_call', 'foodie_call', 'figuring_it_out', 'serious', 'other'] },
            connectionTypeCustom: { type: 'string' },
            favoriteFoods: { type: 'array', items: { type: 'string' } },
            hobbies: { type: 'array', items: { type: 'string' } },
            redFlags: { type: 'array', items: { type: 'string' } },
            greenFlags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<PersonInput> }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, personId: id, body: request.body }, 'Updating person');

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      const updateData: any = {
        ...request.body,
        updatedAt: new Date(),
      };
      if (request.body.zodiac !== undefined) {
        updateData.zodiac = request.body.zodiac as any;
      }
      if (request.body.connectionType !== undefined) {
        updateData.connectionType = request.body.connectionType as any;
      }

      const [updated] = await app.db
        .update(schema.persons)
        .set(updateData)
        .where(eq(schema.persons.id, id))
        .returning();

      app.logger.info({ userId: session.user.id, personId: id }, 'Person updated');
      return updated;
    }
  );

  // DELETE /api/persons/:id - Delete a person
  app.fastify.delete(
    '/api/persons/:id',
    {
      schema: {
        description: 'Delete a person',
        tags: ['persons'],
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
      app.logger.info({ userId: session.user.id, personId: id }, 'Deleting person');

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      await app.db.delete(schema.persons).where(eq(schema.persons.id, id));

      app.logger.info({ userId: session.user.id, personId: id }, 'Person deleted');
      return { success: true };
    }
  );

  // POST /api/persons/:id/bench - Bench a person
  app.fastify.post(
    '/api/persons/:id/bench',
    {
      schema: {
        description: 'Bench a person (set is_benched to true)',
        tags: ['persons'],
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
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              isBenched: { type: 'boolean' },
              benchReason: { type: ['string', 'null'] },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { reason } = request.body;
      app.logger.info({ userId: session.user.id, personId: id, reason }, 'Benching person');

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      const [updated] = await app.db
        .update(schema.persons)
        .set({
          isBenched: true,
          benchReason: reason || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.persons.id, id))
        .returning();

      app.logger.info({ userId: session.user.id, personId: id }, 'Person benched');
      return updated;
    }
  );

  // POST /api/persons/:id/unbenched - Unbenched a person
  app.fastify.post(
    '/api/persons/:id/unbenched',
    {
      schema: {
        description: 'Unbenched a person (set is_benched to false)',
        tags: ['persons'],
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
              id: { type: 'string', format: 'uuid' },
              isBenched: { type: 'boolean' },
              benchReason: { type: ['string', 'null'] },
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
      app.logger.info({ userId: session.user.id, personId: id }, 'Unbedching person');

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      const [updated] = await app.db
        .update(schema.persons)
        .set({
          isBenched: false,
          benchReason: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.persons.id, id))
        .returning();

      app.logger.info({ userId: session.user.id, personId: id }, 'Person unbenched');
      return updated;
    }
  );

  // GET /api/bench - List benched persons
  app.fastify.get(
    '/api/bench',
    {
      schema: {
        description: 'List all benched persons for the authenticated user',
        tags: ['persons'],
        response: {
          200: {
            type: 'object',
            properties: {
              persons: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    isBenched: { type: 'boolean' },
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

      app.logger.info({ userId: session.user.id }, 'Listing benched persons');

      const persons = await app.db
        .select()
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, true)));

      app.logger.info({ userId: session.user.id, count: persons.length }, 'Listed benched persons');
      return { persons };
    }
  );

  // GET /api/persons/stats - Get stats about persons and dates
  app.fastify.get(
    '/api/persons/stats',
    {
      schema: {
        description: 'Get statistics about persons and dates for the authenticated user',
        tags: ['persons'],
        response: {
          200: {
            type: 'object',
            properties: {
              active_count: { type: 'integer' },
              benched_count: { type: 'integer' },
              dates_count: { type: 'integer' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting person and date stats');

      // Count active persons
      const activeResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, false)));

      // Count benched persons
      const benchedResult = await app.db
        .select({ count: count() })
        .from(schema.persons)
        .where(and(eq(schema.persons.userId, session.user.id), eq(schema.persons.isBenched, true)));

      // Count dates
      const datesResult = await app.db
        .select({ count: count() })
        .from(schema.dates)
        .where(eq(schema.dates.userId, session.user.id));

      const stats = {
        active_count: activeResult[0]?.count || 0,
        benched_count: benchedResult[0]?.count || 0,
        dates_count: datesResult[0]?.count || 0,
      };

      app.logger.info({ userId: session.user.id, stats }, 'Stats retrieved');
      return stats;
    }
  );
}
