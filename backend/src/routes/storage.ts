import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function registerStorageRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.post(
    '/api/upload-photo',
    {
      bodyLimit: 10 * 1024 * 1024, // 10MB
      schema: {
        description: 'Upload a photo (base64 or data URI) and return a URL',
        tags: ['storage'],
        body: {
          type: 'object',
          required: ['base64'],
          properties: {
            base64: { type: 'string', description: 'Base64 encoded image or full data URI' },
            person_id: { type: ['string', 'null'], format: 'uuid', description: 'Optional person ID (unused)' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Body: { base64: string; person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { base64 } = request.body;

      // Extract mime type from data URI prefix if present, otherwise default to jpeg
      let mimeType = 'image/jpeg';
      let rawBase64 = base64;

      if (base64.includes('data:')) {
        // Data URI format: "data:image/png;base64,..." or "data:image/jpeg;base64,..."
        const mimeMatch = base64.match(/data:([^;]+);/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1];
        }

        // Extract raw base64 after the comma
        const commaIndex = base64.indexOf(',');
        if (commaIndex !== -1) {
          rawBase64 = base64.substring(commaIndex + 1);
        }
      }

      app.logger.info({ userId }, `[upload-photo] Processing base64 image, length: ${rawBase64.length}, mime type: ${mimeType}`);

      // Reconstruct full data URI with detected mime type
      const photoUrl = `data:${mimeType};base64,${rawBase64}`;

      app.logger.info({ userId }, `[upload-photo] Image processed successfully`);

      return { photo_url: photoUrl };
    }
  );
}
