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
          required: ['image_base64', 'mime_type'],
          properties: {
            image_base64: { type: 'string' },
            mime_type: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { image_base64: string; mime_type: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { image_base64, mime_type } = request.body;
      app.logger.info({ userId: session.user.id }, 'Uploading photo');

      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(image_base64, 'base64');

        // Generate a unique filename
        const timestamp = Date.now();
        const filename = `photos/${session.user.id}/${timestamp}.${getMimeExtension(mime_type)}`;

        // Upload to file storage
        const url = await app.storage.upload(filename, buffer);

        app.logger.info({ userId: session.user.id, filename }, 'Photo uploaded successfully');
        reply.status(201);
        return { url };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to upload photo');
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
