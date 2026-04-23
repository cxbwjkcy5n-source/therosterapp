import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function registerStorageRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.post(
    '/api/upload-photo',
    {
      schema: {
        description: 'Upload a photo and get a URL',
        tags: ['storage'],
        body: {
          type: 'object',
          required: ['base64'],
          properties: {
            base64: { type: 'string' },
            person_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              photo_url: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { base64: string; person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { base64, person_id } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Uploading photo');

      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(base64, 'base64');

        // Generate a unique filename
        const timestamp = Date.now();
        const filename = `photos/${session.user.id}/${timestamp}.jpg`;

        // Upload to file storage
        const photo_url = await app.storage.upload(filename, buffer);

        app.logger.info({ userId: session.user.id, filename, personId: person_id }, 'Photo uploaded successfully');
        reply.status(201);
        return { photo_url };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id }, 'Failed to upload photo');
        throw error;
      }
    }
  );
}

function getMimeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'jpg';
}
