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
        description: 'Upload a photo (base64 or data URI) and optionally update a person record',
        tags: ['storage'],
        body: {
          type: 'object',
          required: ['base64'],
          properties: {
            base64: { type: 'string', description: 'Base64 encoded image or full data URI' },
            person_id: { type: 'string', format: 'uuid', description: 'Optional person ID to update with the photo' },
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
    async (request: FastifyRequest<{ Body: { base64: string; person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { base64, person_id } = request.body;

      app.logger.info({ userId, personId: person_id }, 'Uploading photo');

      // Normalize base64 to full data URI
      let photoUrl: string;
      if (base64.startsWith('data:')) {
        photoUrl = base64;
      } else {
        photoUrl = `data:image/jpeg;base64,${base64}`;
      }

      // If person_id is provided, update the persons table with ownership check
      if (person_id) {
        const [updated] = await app.db
          .update(schema.persons)
          .set({
            photoUrl: photoUrl,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.persons.id, person_id), eq(schema.persons.userId, userId)))
          .returning();

        if (!updated) {
          app.logger.warn({ userId, personId: person_id }, 'Person not found or unauthorized');
          return reply.status(404).send({ error: 'Person not found' });
        }

        app.logger.info({ userId, personId: person_id }, 'Photo uploaded successfully');
      } else {
        app.logger.info({ userId }, 'Photo uploaded without person association');
      }

      return { photo_url: photoUrl };
    }
  );
}
