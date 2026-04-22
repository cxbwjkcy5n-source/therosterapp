import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface ProfileUpdateInput {
  name?: string;
  photo_url?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  location?: string;
  occupation?: string;
  bio?: string;
  favorite_foods?: string[];
  hobbies?: string[];
  green_flags?: string[];
  red_flags?: string[];
  attractiveness_self?: number;
  communication_self?: number;
  instagram?: string;
  tiktok?: string;
  twitter_x?: string;
  phone_number?: string;
}

export function registerProfilesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/profile - Get user profile
  app.fastify.get(
    '/api/profile',
    {
      schema: {
        description: 'Get the authenticated user profile',
        tags: ['profile'],
        response: {
          200: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  image: { type: ['string', 'null'] },
                  photo_url: { type: ['string', 'null'] },
                  age: { type: ['integer', 'null'] },
                  birthday: { type: ['string', 'null'] },
                  zodiac: { type: ['string', 'null'] },
                  location: { type: ['string', 'null'] },
                  occupation: { type: ['string', 'null'] },
                  bio: { type: ['string', 'null'] },
                  favorite_foods: { type: ['array', 'null'], items: { type: 'string' } },
                  hobbies: { type: ['array', 'null'], items: { type: 'string' } },
                  green_flags: { type: ['array', 'null'], items: { type: 'string' } },
                  red_flags: { type: ['array', 'null'], items: { type: 'string' } },
                  attractiveness_self: { type: ['integer', 'null'] },
                  communication_self: { type: ['integer', 'null'] },
                  instagram: { type: ['string', 'null'] },
                  tiktok: { type: ['string', 'null'] },
                  twitter_x: { type: ['string', 'null'] },
                  phone_number: { type: ['string', 'null'] },
                  created_at: { type: ['string', 'null'], format: 'date-time' },
                  updated_at: { type: ['string', 'null'], format: 'date-time' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting user profile');

      // Get user data
      const userData = session.user;

      // Get user profile data
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      // Merge user and profile data
      const profile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image || null,
        photo_url: userProfile?.photoUrl || null,
        age: userProfile?.age || null,
        birthday: userProfile?.birthday || null,
        zodiac: userProfile?.zodiac || null,
        location: userProfile?.location || null,
        occupation: userProfile?.occupation || null,
        bio: userProfile?.bio || null,
        favorite_foods: userProfile?.favoriteFoods || null,
        hobbies: userProfile?.hobbies || null,
        green_flags: userProfile?.greenFlags || null,
        red_flags: userProfile?.redFlags || null,
        attractiveness_self: userProfile?.attractivenessSelf || null,
        communication_self: userProfile?.communicationSelf || null,
        instagram: userProfile?.instagram || null,
        tiktok: userProfile?.tiktok || null,
        twitter_x: userProfile?.twitterX || null,
        phone_number: userProfile?.phoneNumber || null,
        created_at: userProfile?.createdAt || null,
        updated_at: userProfile?.updatedAt || null,
      };

      app.logger.info({ userId: session.user.id }, 'Retrieved user profile');
      return { profile };
    }
  );

  // PUT /api/profile - Update user profile
  app.fastify.put(
    '/api/profile',
    {
      schema: {
        description: 'Update the authenticated user profile',
        tags: ['profile'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            photo_url: { type: 'string' },
            age: { type: 'integer' },
            birthday: { type: 'string' },
            zodiac: { type: 'string' },
            location: { type: 'string' },
            occupation: { type: 'string' },
            bio: { type: 'string' },
            favorite_foods: { type: 'array', items: { type: 'string' } },
            hobbies: { type: 'array', items: { type: 'string' } },
            green_flags: { type: 'array', items: { type: 'string' } },
            red_flags: { type: 'array', items: { type: 'string' } },
            attractiveness_self: { type: 'integer' },
            communication_self: { type: 'integer' },
            instagram: { type: 'string' },
            tiktok: { type: 'string' },
            twitter_x: { type: 'string' },
            phone_number: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ProfileUpdateInput }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId, body: request.body }, 'Updating user profile');

      // Update user name if provided
      if (request.body.name !== undefined) {
        // We would need to update the user table here, but that's part of Better Auth
        // For now, we'll just log it and users would need to update name through auth endpoints
        app.logger.info({ userId }, 'Name update requested but requires auth endpoint');
      }

      // Prepare profile update data
      const profileUpdateData: any = {
        updatedAt: new Date(),
      };

      if (request.body.photo_url !== undefined) profileUpdateData.photoUrl = request.body.photo_url;
      if (request.body.age !== undefined) profileUpdateData.age = request.body.age;
      if (request.body.birthday !== undefined) profileUpdateData.birthday = request.body.birthday;
      if (request.body.zodiac !== undefined) profileUpdateData.zodiac = request.body.zodiac;
      if (request.body.location !== undefined) profileUpdateData.location = request.body.location;
      if (request.body.occupation !== undefined) profileUpdateData.occupation = request.body.occupation;
      if (request.body.bio !== undefined) profileUpdateData.bio = request.body.bio;
      if (request.body.favorite_foods !== undefined) profileUpdateData.favoriteFoods = request.body.favorite_foods;
      if (request.body.hobbies !== undefined) profileUpdateData.hobbies = request.body.hobbies;
      if (request.body.green_flags !== undefined) profileUpdateData.greenFlags = request.body.green_flags;
      if (request.body.red_flags !== undefined) profileUpdateData.redFlags = request.body.red_flags;
      if (request.body.attractiveness_self !== undefined) profileUpdateData.attractivenessSelf = request.body.attractiveness_self;
      if (request.body.communication_self !== undefined) profileUpdateData.communicationSelf = request.body.communication_self;
      if (request.body.instagram !== undefined) profileUpdateData.instagram = request.body.instagram;
      if (request.body.tiktok !== undefined) profileUpdateData.tiktok = request.body.tiktok;
      if (request.body.twitter_x !== undefined) profileUpdateData.twitterX = request.body.twitter_x;
      if (request.body.phone_number !== undefined) profileUpdateData.phoneNumber = request.body.phone_number;

      // Check if user profile exists
      const existingProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, userId),
      });

      if (existingProfile) {
        // Update existing profile
        await app.db
          .update(schema.userProfiles)
          .set(profileUpdateData)
          .where(eq(schema.userProfiles.userId, userId));
      } else {
        // Create new profile
        await app.db.insert(schema.userProfiles).values({
          userId,
          ...profileUpdateData,
          createdAt: new Date(),
        });
      }

      // Fetch updated profile
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, userId),
      });

      const profile = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image || null,
        photo_url: userProfile?.photoUrl || null,
        age: userProfile?.age || null,
        birthday: userProfile?.birthday || null,
        zodiac: userProfile?.zodiac || null,
        location: userProfile?.location || null,
        occupation: userProfile?.occupation || null,
        bio: userProfile?.bio || null,
        favorite_foods: userProfile?.favoriteFoods || null,
        hobbies: userProfile?.hobbies || null,
        green_flags: userProfile?.greenFlags || null,
        red_flags: userProfile?.redFlags || null,
        attractiveness_self: userProfile?.attractivenessSelf || null,
        communication_self: userProfile?.communicationSelf || null,
        instagram: userProfile?.instagram || null,
        tiktok: userProfile?.tiktok || null,
        twitter_x: userProfile?.twitterX || null,
        phone_number: userProfile?.phoneNumber || null,
        created_at: userProfile?.createdAt || null,
        updated_at: userProfile?.updatedAt || null,
      };

      app.logger.info({ userId }, 'User profile updated');
      return { profile };
    }
  );
}
