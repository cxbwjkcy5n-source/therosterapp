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

      // Helper function to get value from request body supporting both camelCase and snake_case
      const getFieldValue = (camelCase: string, snakeCase: string): any => {
        const body = request.body as any;
        if (Object.prototype.hasOwnProperty.call(body, snakeCase)) {
          return body[snakeCase];
        }
        if (Object.prototype.hasOwnProperty.call(body, camelCase)) {
          return body[camelCase];
        }
        return undefined;
      };

      // Check if a field is present in the request body (either form)
      const hasField = (camelCase: string, snakeCase: string): boolean => {
        const body = request.body as any;
        return Object.prototype.hasOwnProperty.call(body, camelCase) || Object.prototype.hasOwnProperty.call(body, snakeCase);
      };

      // UNBENCH FAST PATH - Check for is_benched === false BEFORE building SET clause
      const isBenchedValue = getFieldValue('isBenched', 'is_benched');
      if (isBenchedValue === false) {
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

      // Build dynamic SET clause supporting ALL fields with both camelCase and snake_case
      const updateData: any = {};

      // List of all updatable fields with their mappings: { camelCase, snakeCase, dbField }
      const fieldMappings = [
        { camel: 'name', snake: 'name', dbField: 'name' },
        { camel: 'location', snake: 'location', dbField: 'location' },
        { camel: 'photoUrl', snake: 'photo_url', dbField: 'photoUrl' },
        { camel: 'age', snake: 'age', dbField: 'age' },
        { camel: 'birthday', snake: 'birthday', dbField: 'birthday' },
        { camel: 'zodiac', snake: 'zodiac', dbField: 'zodiac' },
        { camel: 'phoneNumber', snake: 'phone_number', dbField: 'phoneNumber' },
        { camel: 'instagram', snake: 'instagram', dbField: 'instagram' },
        { camel: 'tiktok', snake: 'tiktok', dbField: 'tiktok' },
        { camel: 'twitterX', snake: 'twitter_x', dbField: 'twitterX' },
        { camel: 'facebook', snake: 'facebook', dbField: 'facebook' },
        { camel: 'interestLevel', snake: 'interest_level', dbField: 'interestLevel' },
        { camel: 'attractiveness', snake: 'attractiveness', dbField: 'attractiveness' },
        { camel: 'sexualChemistry', snake: 'sexual_chemistry', dbField: 'sexualChemistry' },
        { camel: 'communication', snake: 'communication', dbField: 'communication' },
        { camel: 'overallChemistry', snake: 'overall_chemistry', dbField: 'overallChemistry' },
        { camel: 'consistency', snake: 'consistency', dbField: 'consistency' },
        { camel: 'emotionalAvailability', snake: 'emotional_availability', dbField: 'emotionalAvailability' },
        { camel: 'datePlanning', snake: 'date_planning', dbField: 'datePlanning' },
        { camel: 'alignment', snake: 'alignment', dbField: 'alignment' },
        { camel: 'connectionType', snake: 'connection_type', dbField: 'connectionType' },
        { camel: 'connectionTypeCustom', snake: 'connection_type_custom', dbField: 'connectionTypeCustom' },
        { camel: 'favoriteFoods', snake: 'favorite_foods', dbField: 'favoriteFoods' },
        { camel: 'hobbies', snake: 'hobbies', dbField: 'hobbies' },
        { camel: 'redFlags', snake: 'red_flags', dbField: 'redFlags' },
        { camel: 'greenFlags', snake: 'green_flags', dbField: 'greenFlags' },
      ];

      // Populate updateData with all fields that are present in the request body
      for (const mapping of fieldMappings) {
        if (hasField(mapping.camel, mapping.snake)) {
          updateData[mapping.dbField] = getFieldValue(mapping.camel, mapping.snake);
        }
      }

      // Handle isBenched and benchReason with proper logic
      if (hasField('isBenched', 'is_benched')) {
        const val = getFieldValue('isBenched', 'is_benched');
        if (val === true || val === 'true') {
          updateData.isBenched = true;
        } else if (val === false || val === 'false') {
          updateData.isBenched = false;
          updateData.benchReason = null;
        }
      }

      if (hasField('benchReason', 'bench_reason')) {
        updateData.benchReason = getFieldValue('benchReason', 'bench_reason');
      }

      // Check if any real fields were provided (not just updatedAt)
      const hasRealFields = Object.keys(updateData).length > 0;
      if (!hasRealFields) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'No valid fields provided for update');
        return reply.status(400).send({ error: 'No valid fields provided' });
      }

      // Always include updated_at
      updateData.updatedAt = new Date();

      app.logger.debug({ userId: session.user.id, personId: id, updateData }, 'Executing person update with data');

      const [updated] = await app.db
        .update(schema.persons)
        .set(updateData)
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
