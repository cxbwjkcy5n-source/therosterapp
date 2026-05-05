import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import { OpenAI } from 'openai';
import * as schema from '../db/schema/schema.js';
import { desc } from 'drizzle-orm';

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
          required: ['person_id', 'budget'],
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
        Body: { person_id: string; location?: string; budget: number; date_time?: string };
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
        const locationStr = location || 'a great place';
        const mockSuggestions = [
          {
            title: 'Coffee & Conversation',
            description: 'Meet at a cozy café for coffee and getting to know each other.',
            category: 'casual',
            estimated_cost: '$10-20',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('coffee shops ' + locationStr)}`,
          },
          {
            title: 'Food Tasting Tour',
            description: `Explore different restaurants and try various cuisines they love.`,
            category: 'foodie',
            estimated_cost: '$30-60',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('restaurants ' + locationStr)}`,
          },
          {
            title: 'Outdoor Activity',
            description: 'Go hiking, biking, or enjoy a park day together.',
            category: 'active',
            estimated_cost: '$0-20',
            search_url: `https://www.google.com/search?q=${encodeURIComponent('parks trails ' + locationStr)}`,
          },
        ];
        app.logger.info({ userId: session.user.id, personId: person_id }, 'Returning mock date ideas (OPENAI_API_KEY not configured)');
        return { suggestions: mockSuggestions };
      }

      const locationStr = location ? `in ${location}` : 'that you can do anywhere';
      const prompt = `Generate 5 creative date ideas ${locationStr} with a budget of $${budget}. The person's hobbies are: ${hobbiesStr}. Their favorite foods are: ${foodsStr}. Return a JSON array of 5 objects with fields: title, description, category, estimated_cost (string like '$20-$40'), search_query (a short Google search query for this date idea).`;

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
          search_url: `https://www.google.com/search?q=${encodeURIComponent(suggestion.search_query + (location ? ' ' + location : ''))}`,
        }));

        app.logger.info({ userId: session.user.id, personId: person_id, count: enrichedSuggestions.length }, 'Date ideas generated');
        return { suggestions: enrichedSuggestions };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id }, 'Failed to generate date ideas');
        throw error;
      }
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

  // POST /api/chat/message - Send a message with AI coach response and store in history
  app.fastify.post(
    '/api/chat/message',
    {
      schema: {
        description: 'Send a message to the dating coach AI and get a response',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
            person_id: { type: ['string', 'null'], format: 'uuid' },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              reply: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          message: string;
          person_id?: string;
          history?: Array<{ role: 'user' | 'assistant'; content: string }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { message, person_id, history } = request.body;
      app.logger.info({ userId: session.user.id, message, personId: person_id }, 'Getting AI chat response');

      let systemPrompt =
        'You are a supportive, insightful dating coach. Give practical, empathetic advice about dating and relationships. Be concise (2-4 sentences max per response).';

      // If person_id provided, fetch their info and include context
      if (person_id) {
        const person = await app.db.query.persons.findFirst({
          where: eq(schema.persons.id, person_id),
        });

        if (!person) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }

        if (person.userId !== session.user.id) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Access denied to person');
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Build person context with specific format
        const hobbiesStr = person.hobbies && person.hobbies.length > 0 ? person.hobbies.join(', ') : 'not specified';
        const greenFlagsStr = person.greenFlags && person.greenFlags.length > 0 ? person.greenFlags.join(', ') : 'not specified';
        const redFlagsStr = person.redFlags && person.redFlags.length > 0 ? person.redFlags.join(', ') : 'not specified';
        const ageStr = person.age ? `${person.age} years old` : 'age not specified';
        const locationStr = person.location || 'location not specified';
        const interestLevelStr = person.interestLevel !== null ? person.interestLevel : 'not rated';
        const communicationStr = person.communication !== null ? person.communication : 'not rated';
        const overallChemistryStr = person.overallChemistry !== null ? person.overallChemistry : 'not rated';

        const personContext = `The user is asking about ${person.name}, ${ageStr}, located in ${locationStr}. Context: hobbies=${hobbiesStr}, green_flags=${greenFlagsStr}, red_flags=${redFlagsStr}, interest_level=${interestLevelStr}, communication=${communicationStr}, overall_chemistry=${overallChemistryStr}.`;
        systemPrompt = personContext + ' ' + systemPrompt;
      }

      // Build messages array: history + new message
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (history && Array.isArray(history)) {
        messages.push(
          ...history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        );
      }

      messages.push({
        role: 'user',
        content: message,
      });

      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          messages,
        });

        // Save user message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          role: 'user',
          content: message,
        });

        // Save assistant message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          role: 'assistant',
          content: text,
        });

        app.logger.info({ userId: session.user.id, personId: person_id }, 'AI chat response generated');
        app.logger.info({ userId: session.user.id }, 'Chat messages saved to history');
        return { reply: text };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id }, 'Failed to get AI response');
        throw error;
      }
    }
  );

  // POST /api/chat - Send a message to the dating coach AI
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
            person_id: { type: ['string', 'null'], format: 'uuid' },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              reply: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          message: string;
          person_id?: string;
          history?: Array<{ role: 'user' | 'assistant'; content: string }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { message, person_id, history } = request.body;
      app.logger.info({ userId: session.user.id, message, personId: person_id }, 'Getting AI chat response');

      let systemPrompt =
        'You are Nova, a warm and insightful dating coach. Give specific, actionable advice tailored to the user\'s question. Be empathetic, direct, and helpful. Never give the same generic response — always respond to what the user actually asked.';

      // If person_id provided, fetch their info and include context
      if (person_id) {
        const person = await app.db.query.persons.findFirst({
          where: eq(schema.persons.id, person_id),
        });

        if (!person) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }

        if (person.userId !== session.user.id) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Access denied to person');
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Build person context
        const personContext = [
          `Person: ${person.name}`,
          person.age ? `Age: ${person.age}` : null,
          person.location ? `Location: ${person.location}` : null,
          person.hobbies && person.hobbies.length > 0 ? `Hobbies: ${person.hobbies.join(', ')}` : null,
          person.favoriteFoods && person.favoriteFoods.length > 0 ? `Favorite Foods: ${person.favoriteFoods.join(', ')}` : null,
          person.connectionType ? `Connection Type: ${person.connectionType}` : null,
          person.greenFlags && person.greenFlags.length > 0 ? `Green Flags: ${person.greenFlags.join(', ')}` : null,
          person.redFlags && person.redFlags.length > 0 ? `Red Flags: ${person.redFlags.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('. ');

        systemPrompt = `You are Nova, a warm and insightful dating coach. You're helping the user navigate their relationship with ${person.name}. Context about this person: ${personContext}. Give specific, actionable advice tailored to this person and the user's question. Be empathetic, direct, and helpful. Never give the same generic response — always respond to what the user actually asked.`;
      }

      // Build messages array: history + new message (system prompt passed separately)
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (history && Array.isArray(history)) {
        messages.push(
          ...history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        );
      }

      messages.push({
        role: 'user',
        content: message,
      });

      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          messages,
        });

        // Save user message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          role: 'user',
          content: message,
        });

        // Save assistant message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          role: 'assistant',
          content: text,
        });

        app.logger.info({ userId: session.user.id, personId: person_id }, 'AI chat response generated');
        app.logger.info({ userId: session.user.id }, 'Chat messages saved to history');
        return { reply: text };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id }, 'Failed to get AI response');
        throw error;
      }
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
