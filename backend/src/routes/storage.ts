import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerStorageRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.post(
    '/api/upload-photo',
    {
      bodyLimit: 10 * 1024 * 1024, // 10MB
      schema: {
        description: 'Upload a photo (base64 or data URI) and optionally update a person or profile record',
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
          400: { type: 'object', properties: { error: { type: 'string' } } },
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

      // Strip any existing data URI prefix to get raw base64
      let rawBase64 = base64;
      if (base64.includes(',')) {
        const commaIndex = base64.indexOf(',');
        rawBase64 = base64.substring(commaIndex + 1);
      }

      app.logger.info({ userId }, `[upload-photo] Received base64 length: ${rawBase64.length}`);

      // Reconstruct full data URI
      const photoUrl = `data:image/jpeg;base64,${rawBase64}`;

      // Always upsert into user_profiles for the authenticated user
      await app.db
        .insert(schema.userProfiles)
        .values({
          userId,
          photoUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.userProfiles.userId,
          set: {
            photoUrl,
            updatedAt: new Date(),
          },
        });

      app.logger.info({ userId }, `[upload-photo] Stored photo_url for user: ${userId}`);

      // If person_id is provided, also update persons table with ownership check
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
      }

      return { photo_url: photoUrl };
    }
  );
}
