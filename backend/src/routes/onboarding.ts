import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerOnboardingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/onboarding/state - Get onboarding state for current user
  app.fastify.get(
    '/api/onboarding/state',
    {
      schema: {
        description: 'Get the current onboarding state',
        tags: ['onboarding'],
        response: {
          200: {
            type: 'object',
            properties: {
              state: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  completed: { type: 'boolean' },
                  step: { type: 'integer' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
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

      app.logger.info({ userId: session.user.id }, 'Getting onboarding state');

      const state = await app.db.query.onboardingState.findFirst({
        where: eq(schema.onboardingState.userId, session.user.id),
      });

      if (!state) {
        app.logger.info({ userId: session.user.id }, 'No onboarding state found, returning defaults');
        return {
          state: {
            id: '',
            userId: session.user.id,
            completed: false,
            step: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }

      app.logger.info({ userId: session.user.id, step: state.step, completed: state.completed }, 'Onboarding state retrieved');
      return {
        state: {
          id: state.id,
          userId: state.userId,
          completed: state.completed,
          step: state.step,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        },
      };
    }
  );

  // PUT /api/onboarding/state - Update onboarding state
  app.fastify.put(
    '/api/onboarding/state',
    {
      schema: {
        description: 'Update the onboarding state',
        tags: ['onboarding'],
        body: {
          type: 'object',
          properties: {
            completed: { type: 'boolean' },
            step: { type: 'integer' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              state: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  completed: { type: 'boolean' },
                  step: { type: 'integer' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          completed?: boolean;
          step?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { completed, step } = request.body;
      app.logger.info({ userId: session.user.id, completed, step }, 'Updating onboarding state');

      const now = new Date();

      // Upsert onboarding state
      const existing = await app.db.query.onboardingState.findFirst({
        where: eq(schema.onboardingState.userId, session.user.id),
      });

      let state;
      if (existing) {
        // Update existing
        [state] = await app.db
          .update(schema.onboardingState)
          .set({
            completed: completed ?? existing.completed,
            step: step ?? existing.step,
            updatedAt: now,
          })
          .where(eq(schema.onboardingState.userId, session.user.id))
          .returning();
      } else {
        // Create new
        [state] = await app.db
          .insert(schema.onboardingState)
          .values({
            userId: session.user.id,
            completed: completed ?? false,
            step: step ?? 0,
          })
          .returning();
      }

      app.logger.info({ userId: session.user.id, step: state.step, completed: state.completed }, 'Onboarding state updated');
      return {
        state: {
          id: state.id,
          userId: state.userId,
          completed: state.completed,
          step: state.step,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        },
      };
    }
  );
}
