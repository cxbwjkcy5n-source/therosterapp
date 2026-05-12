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
        description: 'Generate a profile share token with selective field sharing',
        tags: ['share'],
        body: {
          type: 'object',
          properties: {
            share_fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to share in the profile',
            },
          },
        },
        response: {
          200: {
            description: 'Token generated successfully',
            type: 'object',
            properties: {
              token: { type: 'string' },
              expires_at: { type: 'string', format: 'date-time' },
              share_fields: { type: 'array', items: { type: 'string' } },
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
      request: FastifyRequest<{ Body: { share_fields?: string[] } }>,
      reply: FastifyReply
    ): Promise<{ token: string; expires_at: string; share_fields: string[] } | void> => {
      app.logger.info({ body: request.body }, 'Generating share token');

      const session = await requireAuth(request, reply);
      if (!session) return;

      // Default share fields if not provided
      const defaultShareFields = ['photo', 'name', 'age', 'location'];
      const shareFields = request.body.share_fields || defaultShareFields;

      // Generate random 8-character uppercase alphanumeric token
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let token = '';
      for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        const result = await app.db
          .insert(schema.shareTokens)
          .values({
            userId: session.user.id,
            token,
            expiresAt,
            shareFields,
          })
          .returning();

        app.logger.info({ token, userId: session.user.id, shareFields }, 'Share token generated');
        return {
          token: result[0].token,
          expires_at: result[0].expiresAt.toISOString(),
          share_fields: result[0].shareFields || defaultShareFields,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to generate share token');
        throw error;
      }
    }
  );

  // GET /api/share/redeem/:token - Redeem a share token and return filtered profile
  app.fastify.get(
    '/api/share/redeem/:token',
    {
      schema: {
        description: 'Redeem a profile share token and get filtered profile data',
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
            description: 'Filtered profile data',
            type: 'object',
            properties: {
              name: { type: 'string' },
              photo_url: { type: ['string', 'null'] },
              age: { type: ['integer', 'null'] },
              birthday: { type: ['string', 'null'] },
              zodiac: { type: ['string', 'null'] },
              location: { type: ['string', 'null'] },
              occupation: { type: ['string', 'null'] },
              bio: { type: ['string', 'null'] },
              instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] },
              twitter_x: { type: ['string', 'null'] },
              phone_number: { type: ['string', 'null'] },
              hobbies: { type: ['array', 'null'], items: { type: 'string' } },
              favorite_foods: { type: ['array', 'null'], items: { type: 'string' } },
              green_flags: { type: ['array', 'null'], items: { type: 'string' } },
              what_i_bring: { type: ['array', 'null'], items: { type: 'string' } },
              share_fields: { type: 'array', items: { type: 'string' } },
              expires_at: { type: 'string', format: 'date-time' },
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
            description: 'Token expired',
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
    ): Promise<Record<string, any> | void> => {
      const { token } = request.params;

      app.logger.info({ token }, 'Redeeming share token');

      try {
        // Look up token (case-insensitive)
        const shareToken = await app.db.query.shareTokens.findFirst({
          where: eq(schema.shareTokens.token, token.toUpperCase()),
        });

        if (!shareToken) {
          app.logger.info({ token }, 'Share token not found');
          return reply.status(404).send({ error: 'Token not found' });
        }

        // Check if expired
        const now = new Date();
        if (shareToken.expiresAt < now) {
          app.logger.info({ token, expired: true }, 'Share token expired');
          return reply.status(410).send({ error: 'Token expired' });
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
        const userData = await app.db
          .select()
          .from(user)
          .where(eq(user.id, shareToken.userId))
          .then(rows => rows[0] || null);

        const displayName = userProfile.displayName && userProfile.displayName.trim() ? userProfile.displayName : userData?.name || null;

        // Get share fields from token (default if not set)
        const defaultShareFields = ['photo', 'name', 'age', 'location'];
        const shareFields = shareToken.shareFields || defaultShareFields;

        // Build response with all possible fields
        const allProfileData: Record<string, any> = {
          name: displayName,
          photo_url: userProfile.photoUrl || null,
          age: userProfile.age || null,
          birthday: userProfile.birthday || null,
          zodiac: userProfile.zodiac || null,
          location: userProfile.location || null,
          occupation: userProfile.occupation || null,
          bio: userProfile.bio || null,
          instagram: userProfile.instagram || null,
          tiktok: userProfile.tiktok || null,
          twitter_x: userProfile.twitterX || null,
          phone_number: userProfile.phoneNumber || null,
          hobbies: userProfile.hobbies || null,
          favorite_foods: userProfile.favoriteFoods || null,
          green_flags: userProfile.greenFlags || null,
          what_i_bring: userProfile.whatIBring || null,
        };

        // Field name to key mapping
        const fieldKeyMap: Record<string, string> = {
          photo: 'photo_url',
          name: 'name',
          age: 'age',
          birthday: 'birthday',
          zodiac: 'zodiac',
          location: 'location',
          occupation: 'occupation',
          bio: 'bio',
          instagram: 'instagram',
          tiktok: 'tiktok',
          twitter_x: 'twitter_x',
          phone_number: 'phone_number',
          hobbies: 'hobbies',
          favorite_foods: 'favorite_foods',
          green_flags: 'green_flags',
          what_i_bring: 'what_i_bring',
        };

        // Filter response to only include shared fields + always include name
        const filteredResponse: Record<string, any> = {
          name: displayName, // Always include name
        };

        for (const field of shareFields) {
          const key = fieldKeyMap[field];
          if (key && key !== 'name') {
            filteredResponse[key] = allProfileData[key];
          }
        }

        // Add share metadata
        filteredResponse.share_fields = shareFields;
        filteredResponse.expires_at = shareToken.expiresAt.toISOString();

        app.logger.info({ token, userId: shareToken.userId, shareFieldsCount: shareFields.length }, 'Share token redeemed');

        return filteredResponse;
      } catch (error) {
        app.logger.error({ err: error, token }, 'Failed to redeem share token');
        throw error;
      }
    }
  );
}
