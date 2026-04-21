import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, avg, isNull, SQL } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerAnalyticsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get(
    '/api/analytics',
    {
      schema: {
        description: 'Get analytics for the authenticated user',
        tags: ['analytics'],
        response: {
          200: {
            type: 'object',
            properties: {
              total_active: { type: 'integer' },
              total_benched: { type: 'integer' },
              total_dates: { type: 'integer' },
              avg_interest_level: { type: ['number', 'null'] },
              avg_attractiveness: { type: ['number', 'null'] },
              avg_communication: { type: ['number', 'null'] },
              connection_breakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
              top_hobbies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    hobby: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
              top_foods: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    food: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
              interest_distribution: {
                type: 'object',
                properties: {
                  low: { type: 'integer' },
                  medium: { type: 'integer' },
                  high: { type: 'integer' },
                },
              },
              zodiac_breakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    zodiac: { type: 'string' },
                    count: { type: 'integer' },
                  },
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

      app.logger.info({ userId: session.user.id }, 'Fetching analytics');

      const userPersons = await app.db
        .select()
        .from(schema.persons)
        .where(eq(schema.persons.userId, session.user.id));

      const userDates = await app.db
        .select()
        .from(schema.dates)
        .where(eq(schema.dates.userId, session.user.id));

      // Count active and benched
      const totalActive = userPersons.filter((p) => !p.isBenched).length;
      const totalBenched = userPersons.filter((p) => p.isBenched).length;
      const totalDates = userDates.length;

      // Calculate averages
      const nonNullPersons = userPersons.filter((p) => p.interestLevel !== null);
      const avgInterestLevel =
        nonNullPersons.length > 0
          ? nonNullPersons.reduce((sum, p) => sum + (p.interestLevel || 0), 0) / nonNullPersons.length
          : null;

      const attractivenessPersons = userPersons.filter((p) => p.attractiveness !== null);
      const avgAttractiveness =
        attractivenessPersons.length > 0
          ? attractivenessPersons.reduce((sum, p) => sum + (p.attractiveness || 0), 0) / attractivenessPersons.length
          : null;

      const communicationPersons = userPersons.filter((p) => p.communication !== null);
      const avgCommunication =
        communicationPersons.length > 0
          ? communicationPersons.reduce((sum, p) => sum + (p.communication || 0), 0) / communicationPersons.length
          : null;

      // Connection type breakdown
      const connectionMap = new Map<string | null, number>();
      for (const person of userPersons) {
        const type = person.connectionType;
        connectionMap.set(type, (connectionMap.get(type) || 0) + 1);
      }
      const connectionBreakdown = Array.from(connectionMap.entries())
        .filter(([type]) => type !== null)
        .map(([type, cnt]) => ({ type: type || 'none', count: cnt }));

      // Top hobbies
      const hobbyMap = new Map<string, number>();
      for (const person of userPersons) {
        if (person.hobbies) {
          for (const hobby of person.hobbies) {
            hobbyMap.set(hobby, (hobbyMap.get(hobby) || 0) + 1);
          }
        }
      }
      const topHobbies = Array.from(hobbyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hobby, cnt]) => ({ hobby, count: cnt }));

      // Top foods
      const foodMap = new Map<string, number>();
      for (const person of userPersons) {
        if (person.favoriteFoods) {
          for (const food of person.favoriteFoods) {
            foodMap.set(food, (foodMap.get(food) || 0) + 1);
          }
        }
      }
      const topFoods = Array.from(foodMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([food, cnt]) => ({ food, count: cnt }));

      // Interest distribution
      const interestDistribution = {
        low: userPersons.filter((p) => p.interestLevel !== null && p.interestLevel >= 1 && p.interestLevel <= 3).length,
        medium: userPersons.filter((p) => p.interestLevel !== null && p.interestLevel >= 4 && p.interestLevel <= 7).length,
        high: userPersons.filter((p) => p.interestLevel !== null && p.interestLevel >= 8 && p.interestLevel <= 10).length,
      };

      // Zodiac breakdown
      const zodiacMap = new Map<string, number>();
      for (const person of userPersons) {
        if (person.zodiac) {
          zodiacMap.set(person.zodiac, (zodiacMap.get(person.zodiac) || 0) + 1);
        }
      }
      const zodiacBreakdown = Array.from(zodiacMap.entries()).map(([zodiac, cnt]) => ({ zodiac, count: cnt }));

      app.logger.info({ userId: session.user.id }, 'Analytics computed successfully');

      return {
        total_active: totalActive,
        total_benched: totalBenched,
        total_dates: totalDates,
        avg_interest_level: avgInterestLevel,
        avg_attractiveness: avgAttractiveness,
        avg_communication: avgCommunication,
        connection_breakdown: connectionBreakdown,
        top_hobbies: topHobbies,
        top_foods: topFoods,
        interest_distribution: interestDistribution,
        zodiac_breakdown: zodiacBreakdown,
      };
    }
  );
}
