import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface SafetyCheckinInput {
  person_id?: string;
  date_location?: string;
  person_description?: string;
  emergency_contacts?: string[];
}

export function registerSafetyCheckinsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/safety-checkins - Create a safety check-in
  app.fastify.post(
    '/api/safety-checkins',
    {
      schema: {
        description: 'Create a safety check-in for a date',
        tags: ['safety-checkins'],
        body: {
          type: 'object',
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            date_location: { type: 'string' },
            person_description: { type: 'string' },
            emergency_contacts: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              share_message: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SafetyCheckinInput }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id, body: request.body },
        'Creating safety check-in'
      );

      const insertData: any = {
        userId: session.user.id,
      };

      // Add optional fields only if provided
      if (request.body.person_id !== undefined) insertData.personId = request.body.person_id;
      if (request.body.date_location !== undefined) insertData.dateLocation = request.body.date_location;
      if (request.body.person_description !== undefined)
        insertData.personDescription = request.body.person_description;
      if (request.body.emergency_contacts !== undefined)
        insertData.emergencyContacts = request.body.emergency_contacts;

      const [checkin] = await app.db
        .insert(schema.safetyCheckins)
        .values(insertData)
        .returning();

      // Generate share message with the safety check-in information
      const shareMessage = [
        insertData.dateLocation && `Location: ${insertData.dateLocation}`,
        insertData.personDescription && `Person: ${insertData.personDescription}`,
        insertData.emergencyContacts?.length && `Emergency contacts: ${insertData.emergencyContacts.join(', ')}`,
      ]
        .filter(Boolean)
        .join(' | ');

      app.logger.info(
        { userId: session.user.id, checkinId: checkin.id },
        'Safety check-in created'
      );

      reply.status(201);
      return {
        id: checkin.id,
        share_message: shareMessage || 'Safety check-in created',
      };
    }
  );
}
