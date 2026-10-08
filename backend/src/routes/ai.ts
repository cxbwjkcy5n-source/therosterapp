import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
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

      const locationStr = location ? `in ${location}` : 'that you can do anywhere';
      const prompt = `Generate 5 creative date ideas ${locationStr} with a budget of $${budget}. The person's hobbies are: ${hobbiesStr}. Their favorite foods are: ${foodsStr}. Return a JSON array of 5 objects with fields: title, description, category, estimated_cost (string like '$20-$40'), search_query (a short Google search query for this date idea).`;

      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          prompt,
        });

        const responseText = text;

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
        app.logger.warn({ err: error, userId: session.user.id, personId: person_id }, 'Failed to generate date ideas with AI, using fallback');

        // Fallback generic suggestions
        const fallbackSuggestions = [
          {
            title: 'Dinner at a Local Restaurant',
            description: 'Explore a highly-rated local restaurant together. Share dishes and enjoy great conversation over a delicious meal.',
            category: 'Food & Drink',
            estimated_cost: '$40-60',
            search_url: `https://www.yelp.com/search?find_desc=restaurants&find_loc=${encodeURIComponent(location || 'nearby')}`,
          },
          {
            title: 'Scenic Nature Walk',
            description: 'Take a relaxing walk through a local park or nature trail. Enjoy the fresh air and beautiful surroundings while getting to know each other better.',
            category: 'Outdoors',
            estimated_cost: '$0-10',
            search_url: `https://www.google.com/maps/search/parks+near+${encodeURIComponent(location || 'nearby')}`,
          },
          {
            title: 'Coffee & Bookstore Browse',
            description: 'Start with coffee at a cozy café, then wander through a local bookstore. Share your favorite reads and discover new ones together.',
            category: 'Cozy',
            estimated_cost: '$15-25',
            search_url: `https://www.yelp.com/search?find_desc=coffee+shops&find_loc=${encodeURIComponent(location || 'nearby')}`,
          },
          {
            title: 'Live Music or Comedy Show',
            description: 'Catch a live performance at a local venue. Whether it\'s a band or a comedy night, shared laughter and music create great memories.',
            category: 'Entertainment',
            estimated_cost: '$30-60',
            search_url: `https://www.google.com/maps/search/live+music+venues+near+${encodeURIComponent(location || 'nearby')}`,
          },
          {
            title: 'Art Museum or Gallery Visit',
            description: 'Spend an afternoon exploring local art together. Discuss your interpretations and discover each other\'s tastes through the exhibits.',
            category: 'Arts & Culture',
            estimated_cost: '$20-40',
            search_url: `https://www.google.com/maps/search/art+museums+near+${encodeURIComponent(location || 'nearby')}`,
          },
        ];

        return { suggestions: fallbackSuggestions };
      }
    }
  );

  // POST /api/date-plan/ideas - Generate personalized date ideas
  app.fastify.post(
    '/api/date-plan/ideas',
    {
      schema: {
        description: 'Generate AI-powered personalized date ideas for a person',
        tags: ['ai'],
        body: {
          type: 'object',
          required: ['person_id'],
          properties: {
            person_id: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            budget: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ideas: {
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
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { person_id: string; location?: string; budget?: number };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id, location: requestLocation, budget } = request.body;

      // Validate person_id is present
      if (!person_id) {
        app.logger.warn({ userId: session.user.id }, 'Missing person_id');
        return reply.status(400).send({ error: 'person_id is required' });
      }

      app.logger.info({ userId: session.user.id, personId: person_id }, 'Generating personalized date ideas');

      // Look up person
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, person_id), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Fetch last 5 dates with this person
      const pastDates = await app.db
        .select({ title: schema.dates.title })
        .from(schema.dates)
        .where(and(eq(schema.dates.personId, person_id), eq(schema.dates.userId, session.user.id)))
        .orderBy(desc(schema.dates.createdAt))
        .limit(5);

      const pastDateTitles = pastDates.map((d) => d.title);

      // Build budget label
      let budgetLabel = '$$'; // default
      if (budget === 25) budgetLabel = '$';
      else if (budget === 75) budgetLabel = '$$';
      else if (budget === 150) budgetLabel = '$$$';
      else if (budget === 300) budgetLabel = '$$$$';

      // Determine location
      const resolvedLocation = requestLocation || person.location || 'your area';

      // Build user prompt dynamically
      let userPrompt = `Generate 5 personalized date ideas for a date with ${person.name}${person.age ? `, age ${person.age}` : ''}.

Location: ${resolvedLocation}
Budget: ${budgetLabel}`;

      if (person.connectionType) {
        userPrompt += `\nConnection type: ${person.connectionType}`;
      }
      if (person.career) {
        userPrompt += `\nTheir career: ${person.career}`;
      }
      if (person.hobbies && person.hobbies.length > 0) {
        userPrompt += `\nTheir hobbies: ${person.hobbies.join(', ')}`;
      }
      if (person.favoriteFoods && person.favoriteFoods.length > 0) {
        userPrompt += `\nTheir favorite foods: ${person.favoriteFoods.join(', ')}`;
      }
      if (person.greenFlags && person.greenFlags.length > 0) {
        userPrompt += `\nTheir green flags: ${person.greenFlags.join(', ')}`;
      }
      if (person.thingsILike) {
        userPrompt += `\nThings I like about them: ${person.thingsILike}`;
      }
      if (pastDateTitles.length > 0) {
        userPrompt += `\nWe've already done these dates (avoid repeating): ${pastDateTitles.join(', ')}`;
      }

      userPrompt += `

For each idea provide:
- title: short catchy name for the date
- description: 2-3 sentence description of the date experience
- category: one of "Food & Drink", "Outdoors", "Arts & Culture", "Entertainment", "Cozy", "Adventure", "Nightlife"
- estimated_cost: a cost range string like "$20-40" or "$50-80" appropriate for the budget level ${budgetLabel}
- search_url: a real Google Maps or Yelp search URL relevant to the idea and location (e.g. https://www.google.com/maps/search/rooftop+bars+in+New+York or https://www.yelp.com/search?find_desc=wine+bars&find_loc=Los+Angeles)

Return ONLY the JSON array, nothing else.`;

      const systemPrompt = `You are a creative date planning assistant. Return ONLY a valid JSON array with exactly 5 date idea objects. No markdown, no explanation, no code blocks — just the raw JSON array. Each object must have these exact keys: title, description, category, estimated_cost, search_url.`;

      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: userPrompt,
        });

        app.logger.info({ userId: session.user.id, personId: person_id, response: text }, 'AI response received');

        // Try to parse JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Could not extract JSON array from AI response');
        }

        const ideas = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(ideas) || ideas.length === 0) {
          throw new Error('AI response is not a valid array');
        }

        app.logger.info({ userId: session.user.id, personId: person_id, count: ideas.length }, 'Date ideas generated');
        return { ideas };
      } catch (error) {
        app.logger.warn({ err: error, userId: session.user.id, personId: person_id }, 'Failed to generate date ideas with AI, using fallback');

        // Fallback generic ideas
        const fallbackIdeas = [
          {
            title: 'Dinner at a Local Restaurant',
            description: 'Explore a highly-rated local restaurant together. Share dishes and enjoy great conversation over a delicious meal.',
            category: 'Food & Drink',
            estimated_cost: '$40-60',
            search_url: `https://www.yelp.com/search?find_desc=restaurants&find_loc=${encodeURIComponent(resolvedLocation)}`,
          },
          {
            title: 'Scenic Nature Walk',
            description: 'Take a relaxing walk through a local park or nature trail. Enjoy the fresh air and beautiful surroundings while getting to know each other better.',
            category: 'Outdoors',
            estimated_cost: '$0-10',
            search_url: `https://www.google.com/maps/search/parks+near+${encodeURIComponent(resolvedLocation)}`,
          },
          {
            title: 'Coffee & Bookstore Browse',
            description: 'Start with coffee at a cozy café, then wander through a local bookstore. Share your favorite reads and discover new ones together.',
            category: 'Cozy',
            estimated_cost: '$15-25',
            search_url: `https://www.yelp.com/search?find_desc=coffee+shops&find_loc=${encodeURIComponent(resolvedLocation)}`,
          },
          {
            title: 'Live Music or Comedy Show',
            description: 'Catch a live performance at a local venue. Whether it\'s a band or a comedy night, shared laughter and music create great memories.',
            category: 'Entertainment',
            estimated_cost: '$30-60',
            search_url: `https://www.google.com/maps/search/live+music+venues+near+${encodeURIComponent(resolvedLocation)}`,
          },
          {
            title: 'Art Museum or Gallery Visit',
            description: 'Spend an afternoon exploring local art together. Discuss your interpretations and discover each other\'s tastes through the exhibits.',
            category: 'Arts & Culture',
            estimated_cost: '$20-40',
            search_url: `https://www.google.com/maps/search/art+museums+near+${encodeURIComponent(resolvedLocation)}`,
          },
        ];

        return { ideas: fallbackIdeas };
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
          personId: person_id ? person_id : undefined,
          role: 'user',
          content: message,
        });

        // Save assistant message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          personId: person_id ? person_id : undefined,
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
          personId: person_id ? person_id : undefined,
          role: 'user',
          content: message,
        });

        // Save assistant message to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          personId: person_id ? person_id : undefined,
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
        querystring: {
          type: 'object',
          properties: {
            person_id: { type: 'string', format: 'uuid', description: 'Optional person ID to filter messages' },
          },
        },
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
                    personId: { type: ['string', 'null'], format: 'uuid' },
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
    async (request: FastifyRequest<{ Querystring: { person_id?: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { person_id } = request.query;
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Fetching chat history');

      // Build where clause
      let whereClause = eq(schema.chatMessages.userId, session.user.id);
      if (person_id) {
        whereClause = and(whereClause, eq(schema.chatMessages.personId, person_id));
      }

      const messages = await app.db
        .select()
        .from(schema.chatMessages)
        .where(whereClause)
        .orderBy(schema.chatMessages.createdAt);

      // Return last 50 messages
      const history = messages.slice(-50);

      app.logger.info({ userId: session.user.id, personId: person_id, count: history.length }, 'Retrieved chat history');
      return { messages: history };
    }
  );
}
