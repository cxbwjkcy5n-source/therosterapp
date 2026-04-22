import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { OpenAI } from 'openai';
import * as schema from '../db/schema/schema.js';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for AI features');
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function registerAIRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/date-plan - AI-powered date planning
  app.fastify.post(
    '/api/date-plan',
    {
      schema: {
        description: 'Get AI-powered date suggestions',
        tags: ['ai'],
        body: {
          type: 'object',
          required: ['person_id', 'location', 'budget'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            budget: { type: 'number' },
            date_time: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    estimated_cost: { type: 'string' },
                    search_url: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { person_id: string; location: string; budget: number; date_time?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id, location, budget } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Planning date with AI');

      const person = await app.db.query.persons.findFirst({
        where: eq(schema.persons.id, person_id),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      if (person.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      const hobbiesStr = person.hobbies?.join(', ') || 'not specified';
      const foodsStr = person.favoriteFoods?.join(', ') || 'not specified';

      // If API key is not configured, return mock suggestions for testing
      if (!hasOpenAIKey()) {
        const mockSuggestions = [
          {
            title: 'Coffee & Conversation',
            description: 'Meet at a cozy café for coffee and getting to know each other.',
            category: 'casual',
            estimated_cost: '$10-20',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('coffee shops ' + location)}`,
          },
          {
            title: 'Food Tasting Tour',
            description: `Explore different restaurants and try various cuisines they love.`,
            category: 'foodie',
            estimated_cost: '$30-60',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('restaurants ' + location)}`,
          },
          {
            title: 'Outdoor Activity',
            description: 'Go hiking, biking, or enjoy a park day together.',
            category: 'active',
            estimated_cost: '$0-20',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('parks trails ' + location)}`,
          },
        ];
        app.logger.info({ userId: session.user.id, personId: person_id }, 'Returning mock date ideas (OPENAI_API_KEY not configured)');
        return { suggestions: mockSuggestions };
      }

      const prompt = `Generate 5 creative date ideas for someone in ${location} with a budget of $${budget}. The person's hobbies are: ${hobbiesStr}. Their favorite foods are: ${foodsStr}. Return a JSON array of 5 objects with fields: title, description, category, estimated_cost (string like '$20-$40'), search_query (a short Google search query for this date idea).`;

      try {
        const message = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.choices[0].message.content || '';

        // Parse the JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Could not parse AI response');
        }

        const suggestions = JSON.parse(jsonMatch[0]);

        // Add search URLs
        const enrichedSuggestions = suggestions.map((suggestion: any) => ({
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category,
          estimated_cost: suggestion.estimated_cost,
          search_url: `https://www.google.com/search?q=${encodeURIComponent(suggestion.search_query + ' ' + location)}`,
        }));

        app.logger.info({ userId: session.user.id, personId: person_id, count: enrichedSuggestions.length }, 'Date ideas generated');
        return { suggestions: enrichedSuggestions };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id }, 'Failed to generate date ideas');
        throw error;
      }
    }
  );

  // POST /api/safety-checkins - Create a safety check-in
  app.fastify.post(
    '/api/safety-checkins',
    {
      schema: {
        description: 'Create a safety check-in for a date',
        tags: ['safety'],
        body: {
          type: 'object',
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            date_location: { type: 'string' },
            person_description: { type: 'string' },
            emergency_contacts: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              share_message: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          person_id?: string;
          date_location?: string;
          person_description?: string;
          emergency_contacts?: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id, date_location, person_description, emergency_contacts } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Creating safety check-in');

      let personName = 'someone';
      if (person_id) {
        const person = await app.db.query.persons.findFirst({
          where: eq(schema.persons.id, person_id),
        });
        if (person) {
          personName = person.name;
        }
      }

      const locationStr = date_location || 'an undisclosed location';
      const descriptionStr = person_description || 'unknown';

      const shareMessage = `Hey! I'm on a date with ${personName} at ${locationStr}. They are wearing/driving: ${descriptionStr}. Please check on me if you don't hear from me. 📍 ${locationStr}`;

      const [checkin] = await app.db
        .insert(schema.safetyCheckins)
        .values({
          userId: session.user.id,
          personId: person_id,
          dateLocation: date_location,
          personDescription: person_description,
          emergencyContacts: emergency_contacts,
        })
        .returning();

      app.logger.info({ userId: session.user.id, checkinId: checkin.id }, 'Safety check-in created');
      reply.status(201);
      return {
        id: checkin.id,
        share_message: shareMessage,
      };
    }
  );

  // GET /api/chat - Get chat messages
  app.fastify.get(
    '/api/chat',
    {
      schema: {
        description: 'Get chat messages with the dating coach',
        tags: ['chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    role: { type: 'string' },
                    content: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
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

      app.logger.info({ userId: session.user.id }, 'Getting chat messages');

      const messages = await app.db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, session.user.id))
        .orderBy(schema.chatMessages.createdAt);

      // Return only last 50
      const recentMessages = messages.slice(-50);

      app.logger.info({ userId: session.user.id, count: recentMessages.length }, 'Retrieved chat messages');
      return { messages: recentMessages };
    }
  );

  // POST /api/chat - Send a chat message
  app.fastify.post(
    '/api/chat',
    {
      schema: {
        description: 'Send a message to the dating coach AI',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              userMessage: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  role: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              assistantMessage: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string' },
                  role: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { message: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { message } = request.body;
      app.logger.info({ userId: session.user.id, message }, 'Sending chat message');

      // Save user message
      const [userMessage] = await app.db
        .insert(schema.chatMessages)
        .values({
          userId: session.user.id,
          role: 'user',
          content: message,
        })
        .returning();

      // Fetch last 20 messages for context
      const recentMessages = await app.db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, session.user.id))
        .orderBy(schema.chatMessages.createdAt);

      const contextMessages = recentMessages.slice(-20).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      let assistantContent: string;

      if (!hasOpenAIKey()) {
        // Provide mock response when API key is not configured
        assistantContent = `I'm Nova, your dating coach. That's a great insight! Here's my perspective: Be authentic and listen actively. Remember that confidence comes from knowing your worth. Take care of yourself first.`;
        app.logger.info({ userId: session.user.id }, 'Returning mock chat response (OPENAI_API_KEY not configured)');
      } else {
        try {
          const systemMessage = {
            role: 'system' as const,
            content:
              'You are Nova, a friendly and empathetic dating coach. Give personalized, actionable advice about dating, relationships, and self-improvement. Keep responses concise (2-4 sentences). Be warm, encouraging, and direct.',
          };

          const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 1024,
            messages: [systemMessage, ...contextMessages] as any,
          });

          assistantContent = response.choices[0].message.content || '';
        } catch (error) {
          app.logger.error({ err: error, userId: session.user.id }, 'Failed to get AI response');
          throw error;
        }
      }

      // Save assistant message
      const [assistantMessage] = await app.db
        .insert(schema.chatMessages)
        .values({
          userId: session.user.id,
          role: 'assistant',
          content: assistantContent,
        })
        .returning();

      app.logger.info({ userId: session.user.id }, 'Chat message processed');
      reply.status(201);
      return { userMessage, assistantMessage };
    }
  );

  // GET /api/chat/history - Get chat message history
  app.fastify.get(
    '/api/chat/history',
    {
      schema: {
        description: 'Get chat message history with the dating coach',
        tags: ['chat'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                userId: { type: 'string' },
                role: { type: 'string' },
                content: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching chat history');

      const messages = await app.db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, session.user.id))
        .orderBy(schema.chatMessages.createdAt);

      // Return last 50 messages
      const history = messages.slice(-50);

      app.logger.info({ userId: session.user.id, count: history.length }, 'Retrieved chat history');
      return history;
    }
  );
}
