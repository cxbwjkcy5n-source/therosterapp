import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, sql } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface PersonInput {
  name: string;
  location: string;
  photoUrl?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  phoneNumber?: string;
  instagram?: string;
  tiktok?: string;
  twitterX?: string;
  facebook?: string;
  interestLevel?: number;
  attractiveness?: number;
  sexualChemistry?: number;
  communication?: number;
  overallChemistry?: number;
  consistency?: number;
  emotionalAvailability?: number;
  datePlanning?: number;
  alignment?: number;
  connectionType?: string;
  connectionTypeCustom?: string;
  favoriteFoods?: string[];
  hobbies?: string[];
  redFlags?: string[];
  greenFlags?: string[];
  isBenched?: boolean;
  benchReason?: string;
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
                    phoneNumber: { type: ['string', 'null'] },
                    instagram: { type: ['string', 'null'] },
                    tiktok: { type: ['string', 'null'] },
                    twitterX: { type: ['string', 'null'] },
                    facebook: { type: ['string', 'null'] },
                    interestLevel: { type: ['integer', 'null'] },
                    attractiveness: { type: ['integer', 'null'] },
                    sexualChemistry: { type: ['integer', 'null'] },
                    communication: { type: ['integer', 'null'] },
                    overallChemistry: { type: ['integer', 'null'] },
                    consistency: { type: ['integer', 'null'] },
                    emotionalAvailability: { type: ['integer', 'null'] },
                    datePlanning: { type: ['integer', 'null'] },
                    alignment: { type: ['integer', 'null'] },
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

      app.logger.info({ userId: session.user.id, benched }, 'Listing persons');

      // Use literal boolean values in SQL instead of parameterized values
      let whereClause = eq(schema.persons.userId, session.user.id);
      if (benched === 'true') {
        whereClause = and(whereClause, sql`is_benched = true`);
      } else {
        // Default to active persons (is_benched = false) when benched is not 'true'
        whereClause = and(whereClause, sql`is_benched = false`);
      }

      const persons = await app.db
        .select()
        .from(schema.persons)
        .where(whereClause);

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
            photoUrl: { type: ['string', 'null'] },
            age: { type: ['integer', 'null'] },
            birthday: { type: ['string', 'null'] },
            zodiac: { type: ['string', 'null'], enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] },
            phoneNumber: { type: ['string', 'null'] },
            instagram: { type: ['string', 'null'] },
            tiktok: { type: ['string', 'null'] },
            twitterX: { type: ['string', 'null'] },
            facebook: { type: ['string', 'null'] },
            interestLevel: { type: ['integer', 'null'] },
            attractiveness: { type: ['integer', 'null'] },
            sexualChemistry: { type: ['integer', 'null'] },
            communication: { type: ['integer', 'null'] },
            overallChemistry: { type: ['integer', 'null'] },
            consistency: { type: ['integer', 'null'] },
            emotionalAvailability: { type: ['integer', 'null'] },
            datePlanning: { type: ['integer', 'null'] },
            alignment: { type: ['integer', 'null'] },
            connectionType: { type: ['string', 'null'], enum: ['friend', 'casual', 'booty_call', 'foodie_call', 'figuring_it_out', 'serious', 'other'] },
            connectionTypeCustom: { type: ['string', 'null'] },
            favoriteFoods: { type: ['array', 'null'], items: { type: 'string' } },
            hobbies: { type: ['array', 'null'], items: { type: 'string' } },
            redFlags: { type: ['array', 'null'], items: { type: 'string' } },
            greenFlags: { type: ['array', 'null'], items: { type: 'string' } },
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
          phoneNumber: request.body.phoneNumber,
          instagram: request.body.instagram,
          tiktok: request.body.tiktok,
          twitterX: request.body.twitterX,
          facebook: request.body.facebook,
          interestLevel: request.body.interestLevel,
          attractiveness: request.body.attractiveness,
          sexualChemistry: request.body.sexualChemistry,
          communication: request.body.communication,
          overallChemistry: request.body.overallChemistry,
          consistency: request.body.consistency,
          emotionalAvailability: request.body.emotionalAvailability,
          datePlanning: request.body.datePlanning,
          alignment: request.body.alignment,
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
              phoneNumber: { type: ['string', 'null'] },
              instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] },
              twitterX: { type: ['string', 'null'] },
              facebook: { type: ['string', 'null'] },
              interestLevel: { type: ['integer', 'null'] },
              attractiveness: { type: ['integer', 'null'] },
              sexualChemistry: { type: ['integer', 'null'] },
              communication: { type: ['integer', 'null'] },
              overallChemistry: { type: ['integer', 'null'] },
              consistency: { type: ['integer', 'null'] },
              emotionalAvailability: { type: ['integer', 'null'] },
              datePlanning: { type: ['integer', 'null'] },
              alignment: { type: ['integer', 'null'] },
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
            zodiac: { type: ['string', 'null'], enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] },
            phoneNumber: { type: ['string', 'null'] },
            instagram: { type: ['string', 'null'] },
            tiktok: { type: ['string', 'null'] },
            twitterX: { type: ['string', 'null'] },
            facebook: { type: ['string', 'null'] },
            interestLevel: { type: ['integer', 'null'] },
            attractiveness: { type: ['integer', 'null'] },
            sexualChemistry: { type: ['integer', 'null'] },
            communication: { type: ['integer', 'null'] },
            overallChemistry: { type: ['integer', 'null'] },
            consistency: { type: ['integer', 'null'] },
            emotionalAvailability: { type: ['integer', 'null'] },
            datePlanning: { type: ['integer', 'null'] },
            alignment: { type: ['integer', 'null'] },
            connectionType: { type: ['string', 'null'], enum: ['friend', 'casual', 'booty_call', 'foodie_call', 'figuring_it_out', 'serious', 'other'] },
            connectionTypeCustom: { type: ['string', 'null'] },
            favoriteFoods: { type: ['array', 'null'], items: { type: 'string' } },
            hobbies: { type: ['array', 'null'], items: { type: 'string' } },
            redFlags: { type: ['array', 'null'], items: { type: 'string' } },
            greenFlags: { type: ['array', 'null'], items: { type: 'string' } },
            isBenched: { type: 'boolean' },
            benchReason: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              person: {
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
                  phoneNumber: { type: ['string', 'null'] },
                  instagram: { type: ['string', 'null'] },
                  tiktok: { type: ['string', 'null'] },
                  twitterX: { type: ['string', 'null'] },
                  facebook: { type: ['string', 'null'] },
                  interestLevel: { type: ['integer', 'null'] },
                  attractiveness: { type: ['integer', 'null'] },
                  sexualChemistry: { type: ['integer', 'null'] },
                  communication: { type: ['integer', 'null'] },
                  overallChemistry: { type: ['integer', 'null'] },
                  consistency: { type: ['integer', 'null'] },
                  emotionalAvailability: { type: ['integer', 'null'] },
                  datePlanning: { type: ['integer', 'null'] },
                  alignment: { type: ['integer', 'null'] },
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
      const body = request.body as any;

      app.logger.info({ userId: session.user.id, personId: id, body }, 'Updating person');

      // Helper to extract values from both snake_case and camelCase
      const getFieldValue = (snakeCase: string, camelCase: string): any => {
        return body[snakeCase] !== undefined ? body[snakeCase] : body[camelCase];
      };

      // Extract all fields, accepting both naming conventions
      let name = getFieldValue('name', 'name');
      let location = getFieldValue('location', 'location');
      let age = getFieldValue('age', 'age');
      let birthday = getFieldValue('birthday', 'birthday');
      let zodiac = getFieldValue('zodiac', 'zodiac');
      if (zodiac === '') zodiac = null;

      let phoneNumber = getFieldValue('phone_number', 'phoneNumber');
      if (phoneNumber === '') phoneNumber = null;

      let instagram = getFieldValue('instagram', 'instagram');
      let tiktok = getFieldValue('tiktok', 'tiktok');
      let twitterX = getFieldValue('twitter_x', 'twitterX');
      let facebook = getFieldValue('facebook', 'facebook');

      let connectionType = getFieldValue('connection_type', 'connectionType');
      if (connectionType === '') connectionType = null;

      let connectionTypeCustom = getFieldValue('connection_type_custom', 'connectionTypeCustom');
      let interestLevel = getFieldValue('interest_level', 'interestLevel');
      let attractiveness = getFieldValue('attractiveness', 'attractiveness');
      let sexualChemistry = getFieldValue('sexual_chemistry', 'sexualChemistry');
      let overallChemistry = getFieldValue('overall_chemistry', 'overallChemistry');
      let communication = getFieldValue('communication', 'communication');
      let consistency = getFieldValue('consistency', 'consistency');
      let emotionalAvailability = getFieldValue('emotional_availability', 'emotionalAvailability');
      let datePlanning = getFieldValue('date_planning', 'datePlanning');
      let alignment = getFieldValue('alignment', 'alignment');
      let photoUrl = getFieldValue('photo_url', 'photoUrl');
      let isBenched = getFieldValue('is_benched', 'isBenched');
      let benchReason = getFieldValue('bench_reason', 'benchReason');
      if (benchReason === '') benchReason = null;

      // SPECIAL CASE: Unbenching fast path
      if (isBenched === false) {
        const [updated] = await app.db
          .update(schema.persons)
          .set({
            isBenched: false,
            benchReason: null,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)))
          .returning();

        if (!updated) {
          app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found after unbench update');
          return reply.status(404).send({ error: 'Person not found' });
        }

        app.logger.info({ userId: session.user.id, personId: id }, 'Person unbenched');
        return { person: updated };
      }

      // Log phone_number parameter value before executing query
      app.logger.debug({ phoneNumberValue: phoneNumber }, 'phone_number parameter');

      // Build params array for hardcoded SQL (24 positional parameters)
      const params = [
        name ?? null,                    // $1
        location ?? null,                // $2
        age ?? null,                     // $3
        birthday ?? null,                // $4
        zodiac ?? null,                  // $5
        phoneNumber ?? null,             // $6
        instagram ?? null,               // $7
        tiktok ?? null,                  // $8
        twitterX ?? null,                // $9
        facebook ?? null,                // $10
        connectionType ?? null,          // $11
        connectionTypeCustom ?? null,    // $12
        interestLevel ?? null,           // $13
        attractiveness ?? null,          // $14
        sexualChemistry ?? null,         // $15
        overallChemistry ?? null,        // $16
        communication ?? null,           // $17
        consistency ?? null,             // $18
        emotionalAvailability ?? null,   // $19
        datePlanning ?? null,            // $20
        alignment ?? null,               // $21
        photoUrl ?? null,                // $22
        id,                              // $23
        session.user.id,                 // $24
      ];

      app.logger.info({ params }, 'PUT /api/persons/:id executing SQL');

      const [updated] = await app.db
        .update(schema.persons)
        .set({
          name: name !== undefined ? name : sql`name`,
          location: location !== undefined ? location : sql`location`,
          age: age !== undefined ? age : sql`age`,
          birthday: birthday !== undefined ? birthday : sql`birthday`,
          zodiac: zodiac !== undefined ? zodiac : sql`zodiac`,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : sql`phone_number`,
          instagram: instagram !== undefined ? instagram : sql`instagram`,
          tiktok: tiktok !== undefined ? tiktok : sql`tiktok`,
          twitterX: twitterX !== undefined ? twitterX : sql`twitter_x`,
          facebook: facebook !== undefined ? facebook : sql`facebook`,
          connectionType: connectionType !== undefined ? connectionType : sql`connection_type`,
          connectionTypeCustom: connectionTypeCustom !== undefined ? connectionTypeCustom : sql`connection_type_custom`,
          interestLevel: interestLevel !== undefined ? interestLevel : sql`interest_level`,
          attractiveness: attractiveness !== undefined ? attractiveness : sql`attractiveness`,
          sexualChemistry: sexualChemistry !== undefined ? sexualChemistry : sql`sexual_chemistry`,
          overallChemistry: overallChemistry !== undefined ? overallChemistry : sql`overall_chemistry`,
          communication: communication !== undefined ? communication : sql`communication`,
          consistency: consistency !== undefined ? consistency : sql`consistency`,
          emotionalAvailability: emotionalAvailability !== undefined ? emotionalAvailability : sql`emotional_availability`,
          datePlanning: datePlanning !== undefined ? datePlanning : sql`date_planning`,
          alignment: alignment !== undefined ? alignment : sql`alignment`,
          photoUrl: photoUrl !== undefined ? photoUrl : sql`photo_url`,
          isBenched: isBenched !== undefined ? isBenched : sql`is_benched`,
          benchReason: benchReason !== undefined ? benchReason : sql`bench_reason`,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)))
        .returning();

      if (!updated) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found after update');
        return reply.status(404).send({ error: 'Person not found' });
      }

      app.logger.info({ userId: session.user.id, personId: id }, 'Person updated');
      return { person: updated };
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
