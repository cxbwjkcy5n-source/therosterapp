import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerPushTokensRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/push-tokens - Register a push notification token
  app.fastify.post(
    '/api/push-tokens',
    {
      schema: {
        description: 'Register a device token for push notifications',
        tags: ['push-tokens'],
        body: {
          type: 'object',
          required: ['token', 'platform'],
          properties: {
            token: { type: 'string', description: 'Device push notification token' },
            platform: { type: 'string', description: 'Platform: ios, android, or web' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              token: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  token: { type: 'string' },
                  platform: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          token: string;
          platform: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { token, platform } = request.body;

      if (!token || !platform) {
        app.logger.warn({ userId: session.user.id }, 'Missing token or platform');
        return reply.status(400).send({ error: 'Token and platform are required' });
      }

      app.logger.info({ userId: session.user.id, platform }, 'Registering push token');

      // Check if token already exists
      const existing = await app.db.query.pushTokens.findFirst({
        where: eq(schema.pushTokens.token, token),
      });

      let pushToken;
      if (existing) {
        app.logger.info({ userId: session.user.id, platform }, 'Token already exists, skipping');
        pushToken = existing;
      } else {
        [pushToken] = await app.db
          .insert(schema.pushTokens)
          .values({
            userId: session.user.id,
            token,
            platform,
          })
          .returning();
      }

      app.logger.info({ userId: session.user.id, platform, tokenId: pushToken.id }, 'Push token registered');
      reply.status(201);
      return {
        token: {
          id: pushToken.id,
          userId: pushToken.userId,
          token: pushToken.token,
          platform: pushToken.platform,
          createdAt: pushToken.createdAt,
        },
      };
    }
  );
}
