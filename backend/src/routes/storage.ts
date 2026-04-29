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
            type: { type: 'string', enum: ['person', 'profile'], description: 'Target type for photo: person or profile (default: profile)' },
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
    async (request: FastifyRequest<{ Body: { base64: string; person_id?: string; type?: 'person' | 'profile' } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { base64, person_id, type } = request.body;

      // Determine if this is a person or profile upload: person_id presence or explicit type
      const isPersonUpload = type === 'person' || !!person_id;

      app.logger.info({ userId, personId: person_id, type, isPersonUpload }, 'Uploading photo');

      // Strip data URI prefix if present to get raw base64, then reconstruct consistently
      let rawBase64 = base64;
      if (base64.startsWith('data:')) {
        // Extract raw base64 from data URI (e.g., "data:image/jpeg;base64,ABC123" -> "ABC123")
        const match = base64.match(/,(.+)$/);
        if (match) {
          rawBase64 = match[1];
        }
      }

      // Reconstruct full data URI
      const photoUrl = `data:image/jpeg;base64,${rawBase64}`;

      if (isPersonUpload && person_id) {
        // Update persons table with ownership check
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

        app.logger.info({ userId, personId: person_id }, 'Person photo uploaded successfully');
        console.log('Photo uploaded for user:', userId, 'person_id:', person_id);
      } else {
        // UPSERT into user_profiles
        const existing = await app.db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.userId, userId),
        });

        if (existing) {
          await app.db
            .update(schema.userProfiles)
            .set({
              photoUrl: photoUrl,
              updatedAt: new Date(),
            })
            .where(eq(schema.userProfiles.userId, userId));
        } else {
          await app.db.insert(schema.userProfiles).values({
            userId,
            photoUrl: photoUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        app.logger.info({ userId }, 'Profile photo uploaded successfully');
        console.log('Photo uploaded for user:', userId, 'person_id:', 'self');
      }

      return { photo_url: photoUrl };
    }
  );
}
