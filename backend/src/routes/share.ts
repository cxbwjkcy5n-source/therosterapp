import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import { user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function registerShareRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/share/generate - Generate a share token
  app.fastify.post(
    '/api/share/generate',
    {
      schema: {
        description: 'Generate a profile share token',
        tags: ['share'],
        response: {
          200: {
            description: 'Token generated successfully',
            type: 'object',
            properties: {
              token: { type: 'string' },
              expires_at: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<{ token: string; expires_at: string } | void> => {
      app.logger.info('Generating share token');

      const session = await requireAuth(request, reply);
      if (!session) return;

      // Generate random 8-character uppercase alphanumeric token
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let token = '';
      for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      try {
        const result = await app.db
          .insert(schema.shareTokens)
          .values({
            userId: session.user.id,
            token,
            expiresAt,
          })
          .returning();

        app.logger.info({ token, userId: session.user.id }, 'Share token generated');
        return {
          token: result[0].token,
          expires_at: result[0].expiresAt.toISOString(),
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to generate share token');
        throw error;
      }
    }
  );

  // GET /api/share/resolve/:token - Resolve a share token and return profile
  app.fastify.get(
    '/api/share/resolve/:token',
    {
      schema: {
        description: 'Resolve a profile share token and get profile data',
        tags: ['share'],
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Profile data',
            type: 'object',
            properties: {
              name: { type: ['string', 'null'] },
              photo_url: { type: ['string', 'null'] },
              age: { type: ['integer', 'null'] },
              occupation: { type: ['string', 'null'] },
              location: { type: ['string', 'null'] },
              instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] },
              twitter_x: { type: ['string', 'null'] },
              phone_number: { type: ['string', 'null'] },
            },
          },
          404: {
            description: 'Token not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          410: {
            description: 'Token expired or already used',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply
    ): Promise<
      | {
          name: string | null;
          photo_url: string | null;
          age: number | null;
          occupation: string | null;
          location: string | null;
          instagram: string | null;
          tiktok: string | null;
          twitter_x: string | null;
          phone_number: string | null;
        }
      | void
    > => {
      const { token } = request.params;

      app.logger.info({ token }, 'Resolving share token');

      try {
        // Look up token (case-insensitive)
        const shareToken = await app.db.query.shareTokens.findFirst({
          where: eq(schema.shareTokens.token, token.toUpperCase()),
        });

        if (!shareToken) {
          app.logger.info({ token }, 'Share token not found');
          return reply.status(404).send({ error: 'Token not found' });
        }

        // Check if expired or used
        const now = new Date();
        if (shareToken.expiresAt < now || shareToken.used) {
          app.logger.info({ token, expired: shareToken.expiresAt < now, used: shareToken.used }, 'Share token expired or used');
          return reply.status(410).send({ error: 'Token expired or already used' });
        }

        // Fetch the user profile and user data
        const userProfile = await app.db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.userId, shareToken.userId),
        });

        if (!userProfile) {
          app.logger.info({ userId: shareToken.userId }, 'User profile not found');
          return reply.status(404).send({ error: 'Token not found' });
        }

        // Fetch the user to get the name if display_name is not set
        const userData = await app.db.query.user.findFirst({
          where: eq(user.id, shareToken.userId),
        });

        const displayName = userProfile.displayName && userProfile.displayName.trim() ? userProfile.displayName : userData?.name || null;

        app.logger.info({ token, userId: shareToken.userId }, 'Share token resolved');

        return {
          name: displayName,
          photo_url: userProfile.photoUrl || null,
          age: userProfile.age || null,
          occupation: userProfile.occupation || null,
          location: userProfile.location || null,
          instagram: userProfile.instagram || null,
          tiktok: userProfile.tiktok || null,
          twitter_x: userProfile.twitterX || null,
          phone_number: userProfile.phoneNumber || null,
        };
      } catch (error) {
        app.logger.error({ err: error, token }, 'Failed to resolve share token');
        throw error;
      }
    }
  );
}
