import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerStorageRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.post(
    '/api/upload-photo',
    {
      schema: {
        description: 'Upload a photo for a person',
        tags: ['storage'],
        body: {
          type: 'object',
          required: ['base64'],
          additionalProperties: true,
          properties: {
            base64: { type: 'string' },
            person_id: { type: ['string', 'integer'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              photo_url: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { base64: string; person_id?: string | number } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { base64, person_id: rawPersonId } = request.body;

      app.logger.info({ userId: session.user.id, personId: rawPersonId }, 'Uploading photo');

      // Construct the data URI
      const photoUrl = 'data:image/jpeg;base64,' + base64;

      // If person_id is provided, update the persons table with the photo URL
      if (rawPersonId !== undefined) {
        // Ensure person_id is a string for UUID query
        const person_id = typeof rawPersonId === 'number' ? String(rawPersonId) : rawPersonId;

        const [updated] = await app.db
          .update(schema.persons)
          .set({
            photoUrl: photoUrl,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.persons.id, person_id), eq(schema.persons.userId, session.user.id)))
          .returning();

        if (!updated) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }

        app.logger.info({ userId: session.user.id, personId: person_id }, 'Photo uploaded successfully');
      } else {
        app.logger.info({ userId: session.user.id }, 'Photo uploaded without person association');
      }

      return { photo_url: photoUrl };
    }
  );
}
