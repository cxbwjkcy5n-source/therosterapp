import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface ProfileUpdateInput {
  display_name?: string;
  photo_url?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  location?: string;
  occupation?: string;
  bio?: string;
  phone_number?: string;
  instagram?: string;
  tiktok?: string;
  twitter_x?: string;
  favorite_foods?: string[];
  hobbies?: string[];
  what_i_bring?: string[];
  things_to_work_on?: string[];
  green_flags?: string[];
  red_flags?: string[];
  attractiveness_self?: number;
  communication_self?: number;
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
              id: { type: ['string', 'null'] },
              userId: { type: ['string', 'null'] },
              displayName: { type: ['string', 'null'] },
              photoUrl: { type: ['string', 'null'] },
              age: { type: ['integer', 'null'] },
              birthday: { type: ['string', 'null'] },
              zodiac: { type: ['string', 'null'] },
              location: { type: ['string', 'null'] },
              occupation: { type: ['string', 'null'] },
              bio: { type: ['string', 'null'] },
              phoneNumber: { type: ['string', 'null'] },
              instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] },
              twitterX: { type: ['string', 'null'] },
              favoriteFoods: { type: ['array', 'null'], items: { type: 'string' } },
              hobbies: { type: ['array', 'null'], items: { type: 'string' } },
              whatIBring: { type: ['array', 'null'], items: { type: 'string' } },
              thingsToWorkOn: { type: ['array', 'null'], items: { type: 'string' } },
              greenFlags: { type: ['array', 'null'], items: { type: 'string' } },
              redFlags: { type: ['array', 'null'], items: { type: 'string' } },
              attractivenessSelf: { type: ['integer', 'null'] },
              communicationSelf: { type: ['integer', 'null'] },
              createdAt: { type: ['string', 'null'], format: 'date-time' },
              updatedAt: { type: ['string', 'null'], format: 'date-time' },
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

      // Get user profile data
      const userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      // Merge display_name from user.name if not set
      const displayName = userProfile?.displayName || session.user.name || null;

      const profile = {
        id: userProfile?.id || null,
        userId: userProfile?.userId || session.user.id,
        displayName,
        photoUrl: userProfile?.photoUrl || null,
        age: userProfile?.age || null,
        birthday: userProfile?.birthday || null,
        zodiac: userProfile?.zodiac || null,
        location: userProfile?.location || null,
        occupation: userProfile?.occupation || null,
        bio: userProfile?.bio || null,
        phoneNumber: userProfile?.phoneNumber || null,
        instagram: userProfile?.instagram || null,
        tiktok: userProfile?.tiktok || null,
        twitterX: userProfile?.twitterX || null,
        favoriteFoods: userProfile?.favoriteFoods || null,
        hobbies: userProfile?.hobbies || null,
        whatIBring: userProfile?.whatIBring || null,
        thingsToWorkOn: userProfile?.thingsToWorkOn || null,
        greenFlags: userProfile?.greenFlags || null,
        redFlags: userProfile?.redFlags || null,
        attractivenessSelf: userProfile?.attractivenessSelf || null,
        communicationSelf: userProfile?.communicationSelf || null,
        createdAt: userProfile?.createdAt || null,
        updatedAt: userProfile?.updatedAt || null,
      };

      app.logger.info({ userId: session.user.id }, 'Retrieved user profile');
      return profile;
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
            display_name: { type: 'string' },
            photo_url: { type: 'string' },
            age: { type: 'integer' },
            birthday: { type: 'string' },
            zodiac: { type: 'string' },
            location: { type: 'string' },
            occupation: { type: 'string' },
            bio: { type: 'string' },
            phone_number: { type: 'string' },
            instagram: { type: 'string' },
            tiktok: { type: 'string' },
            twitter_x: { type: 'string' },
            favorite_foods: { type: 'array', items: { type: 'string' } },
            hobbies: { type: 'array', items: { type: 'string' } },
            what_i_bring: { type: 'array', items: { type: 'string' } },
            things_to_work_on: { type: 'array', items: { type: 'string' } },
            green_flags: { type: 'array', items: { type: 'string' } },
            red_flags: { type: 'array', items: { type: 'string' } },
            attractiveness_self: { type: 'integer' },
            communication_self: { type: 'integer' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: ['string', 'null'] },
              userId: { type: ['string', 'null'] },
              displayName: { type: ['string', 'null'] },
              photoUrl: { type: ['string', 'null'] },
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

      // If display_name is provided, also update user.name
      if (request.body.display_name !== undefined) {
        try {
          await app.auth.api.updateUser({
            body: { name: request.body.display_name },
            headers: new Headers(),
          });
          app.logger.info({ userId }, 'Updated user name via auth API');
        } catch (error) {
          app.logger.warn({ userId, err: error }, 'Failed to update user name');
        }
      }

      // Prepare profile update data
      const profileUpdateData: any = {
        updatedAt: new Date(),
      };

      if (request.body.display_name !== undefined) profileUpdateData.displayName = request.body.display_name;
      if (request.body.photo_url !== undefined) profileUpdateData.photoUrl = request.body.photo_url;
      if (request.body.age !== undefined) profileUpdateData.age = request.body.age;
      if (request.body.birthday !== undefined) profileUpdateData.birthday = request.body.birthday;
      if (request.body.zodiac !== undefined) profileUpdateData.zodiac = request.body.zodiac;
      if (request.body.location !== undefined) profileUpdateData.location = request.body.location;
      if (request.body.occupation !== undefined) profileUpdateData.occupation = request.body.occupation;
      if (request.body.bio !== undefined) profileUpdateData.bio = request.body.bio;
      if (request.body.phone_number !== undefined) profileUpdateData.phoneNumber = request.body.phone_number;
      if (request.body.instagram !== undefined) profileUpdateData.instagram = request.body.instagram;
      if (request.body.tiktok !== undefined) profileUpdateData.tiktok = request.body.tiktok;
      if (request.body.twitter_x !== undefined) profileUpdateData.twitterX = request.body.twitter_x;
      if (request.body.favorite_foods !== undefined) profileUpdateData.favoriteFoods = request.body.favorite_foods;
      if (request.body.hobbies !== undefined) profileUpdateData.hobbies = request.body.hobbies;
      if (request.body.what_i_bring !== undefined) profileUpdateData.whatIBring = request.body.what_i_bring;
      if (request.body.things_to_work_on !== undefined) profileUpdateData.thingsToWorkOn = request.body.things_to_work_on;
      if (request.body.green_flags !== undefined) profileUpdateData.greenFlags = request.body.green_flags;
      if (request.body.red_flags !== undefined) profileUpdateData.redFlags = request.body.red_flags;
      if (request.body.attractiveness_self !== undefined) profileUpdateData.attractivenessSelf = request.body.attractiveness_self;
      if (request.body.communication_self !== undefined) profileUpdateData.communicationSelf = request.body.communication_self;

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

      // Merge display_name from user.name if not set
      const displayName = userProfile?.displayName || session.user.name || null;

      const profile = {
        id: userProfile?.id || null,
        userId: userProfile?.userId || null,
        displayName,
        photoUrl: userProfile?.photoUrl || null,
        age: userProfile?.age || null,
        birthday: userProfile?.birthday || null,
        zodiac: userProfile?.zodiac || null,
        location: userProfile?.location || null,
        occupation: userProfile?.occupation || null,
        bio: userProfile?.bio || null,
        phoneNumber: userProfile?.phoneNumber || null,
        instagram: userProfile?.instagram || null,
        tiktok: userProfile?.tiktok || null,
        twitterX: userProfile?.twitterX || null,
        favoriteFoods: userProfile?.favoriteFoods || null,
        hobbies: userProfile?.hobbies || null,
        whatIBring: userProfile?.whatIBring || null,
        thingsToWorkOn: userProfile?.thingsToWorkOn || null,
        greenFlags: userProfile?.greenFlags || null,
        redFlags: userProfile?.redFlags || null,
        attractivenessSelf: userProfile?.attractivenessSelf || null,
        communicationSelf: userProfile?.communicationSelf || null,
        createdAt: userProfile?.createdAt || null,
        updatedAt: userProfile?.updatedAt || null,
      };

      app.logger.info({ userId }, 'User profile updated');
      return profile;
    }
  );
}
