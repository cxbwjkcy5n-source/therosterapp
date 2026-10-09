import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText, streamText } from 'ai';
import * as schema from '../db/schema/schema.js';

export function registerAIRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Helper to build rich system prompt for dating coach
  function buildCoachSystemPrompt(): string {
    return `You are a personal dating coach for the user of the Roster app — a private dating life management tool. You are warm, direct, non-judgmental, and give actionable advice. You understand modern dating dynamics, attachment styles, and communication patterns.

Keep responses concise (2-4 paragraphs max). Be honest even if the truth is uncomfortable. Never be preachy. Focus on what the user can actually do.`;
  }

  // Helper to build person context
  async function buildPersonContext(personId: string, userId: string): Promise<{ person: any; context: string } | null> {
    const person = await app.db.query.persons.findFirst({
      where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, userId)),
    });

    if (!person) {
      return null;
    }

    // Get dates count
    const datesResult = await app.db
      .select()
      .from(schema.dates)
      .where(and(eq(schema.dates.personId, personId), eq(schema.dates.userId, userId)));
    const datesCount = datesResult.length;

    // Build rating strings, excluding fields in excluded_ratings
    const excludedSet = new Set(person.excludedRatings || []);
    const ratings: string[] = [];

    if (person.attractiveness !== null && !excludedSet.has('attractiveness')) {
      ratings.push(`Attractiveness ${person.attractiveness}`);
    }
    if (person.communication !== null && !excludedSet.has('communication')) {
      ratings.push(`Communication ${person.communication}`);
    }
    if (person.sexualChemistry !== null && !excludedSet.has('sexual_chemistry')) {
      ratings.push(`Sexual Chemistry ${person.sexualChemistry}`);
    }
    if (person.overallChemistry !== null && !excludedSet.has('overall_chemistry')) {
      ratings.push(`Overall Chemistry ${person.overallChemistry}`);
    }
    if (person.consistency !== null && !excludedSet.has('consistency')) {
      ratings.push(`Consistency ${person.consistency}`);
    }
    if (person.emotionalAvailability !== null && !excludedSet.has('emotional_availability')) {
      ratings.push(`Emotional Availability ${person.emotionalAvailability}`);
    }
    if (person.datePlanning !== null && !excludedSet.has('date_planning')) {
      ratings.push(`Date Planning ${person.datePlanning}`);
    }
    if (person.alignment !== null && !excludedSet.has('alignment')) {
      ratings.push(`Alignment ${person.alignment}`);
    }
    if (person.interestLevel !== null && !excludedSet.has('interest_level')) {
      ratings.push(`Interest Level ${person.interestLevel}`);
    }

    const ratingsStr = ratings.length > 0 ? ratings.join(', ') : 'no ratings given yet';

    const context = `The user is asking about ${person.name}. Here is everything you know about them:
- Age: ${person.age || 'unknown'}, Zodiac: ${person.zodiac || 'unknown'}, Location: ${person.location}, Career: ${person.career || 'unknown'}
- Connection type: ${person.connectionType || 'unknown'}
- Ratings (out of 10): ${ratingsStr}
- Green flags: ${person.greenFlags?.length ? person.greenFlags.join(', ') : 'none listed'}
- Red flags: ${person.redFlags?.length ? person.redFlags.join(', ') : 'none listed'}
- Hobbies: ${person.hobbies?.length ? person.hobbies.join(', ') : 'none listed'}
- Favorite foods: ${person.favoriteFoods?.length ? person.favoriteFoods.join(', ') : 'none listed'}
- Dating status: ${person.datingStatus || 'unknown'}
- What the user likes about them: ${person.thingsILike || 'nothing noted yet'}
- Dates logged: ${datesCount} dates
- Excluded ratings: ${person.excludedRatings?.length ? person.excludedRatings.join(', ') : 'none'}

Use this context to give highly personalized, specific advice. Reference their actual ratings and flags when relevant.`;

    return { person, context };
  }

  // POST /api/chat/message - Upgraded endpoint with rich context
  app.fastify.post(
    '/api/chat/message',
    {
      schema: {
        description: 'Send a message to the dating coach AI with full person context',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
            person_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          messages: Array<{ role: 'user' | 'assistant'; content: string }>;
          person_id?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { messages, person_id } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id, messageCount: messages.length }, 'Getting AI chat response');

      let systemPrompt = buildCoachSystemPrompt();

      // If person_id provided, fetch their info and include context
      if (person_id) {
        const result = await buildPersonContext(person_id, session.user.id);
        if (!result) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }
        systemPrompt = `${result.context}\n\n${systemPrompt}`;
      }

      try {
        // Ensure all messages have proper structure
        const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content),
        }));

        app.logger.debug({ messageCount: formattedMessages.length, systemPromptLength: systemPrompt.length }, 'Calling generateText');

        let text: string;
        try {
          const result = await generateText({
            model: gateway('openai/gpt-4o-mini'),
            system: systemPrompt,
            messages: formattedMessages,
          });
          text = result.text;
        } catch (aiError) {
          app.logger.warn({ err: aiError, userId: session.user.id }, 'AI gateway error, using fallback');
          // Fallback response for AI errors
          text = "I appreciate you reaching out. I'm here to help you navigate your dating journey. What specific question or situation would you like to discuss?";
        }

        // Save last user message to chat history
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        if (lastUserMsg) {
          await app.db.insert(schema.chatMessages).values({
            userId: session.user.id,
            personId: person_id ? person_id : undefined,
            role: 'user',
            content: lastUserMsg.content,
          });
        }

        // Save assistant response to chat history
        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          personId: person_id ? person_id : undefined,
          role: 'assistant',
          content: text,
        });

        app.logger.info({ userId: session.user.id, personId: person_id }, 'AI chat response generated');
        return { message: { role: 'assistant', content: text } };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id, messages: messages.length }, 'Failed to get AI response');
        return reply.status(500).send({ error: 'Failed to generate response' });
      }
    }
  );

  // POST /api/chat/message/stream - NEW streaming endpoint
  app.fastify.post(
    '/api/chat/message/stream',
    {
      schema: {
        description: 'Stream a message from the dating coach AI with full person context',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
            person_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Server-Sent Events stream of tokens',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          messages: Array<{ role: 'user' | 'assistant'; content: string }>;
          person_id?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { messages, person_id } = request.body;
      app.logger.info({ userId: session.user.id, personId: person_id }, 'Streaming AI chat response');

      let systemPrompt = buildCoachSystemPrompt();

      // If person_id provided, fetch their info and include context
      if (person_id) {
        const result = await buildPersonContext(person_id, session.user.id);
        if (!result) {
          app.logger.warn({ userId: session.user.id, personId: person_id }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }
        systemPrompt = `${result.context}\n\n${systemPrompt}`;
      }

      // Set SSE headers
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      try {
        // Ensure all messages have proper structure
        const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content),
        }));

        app.logger.debug({ messageCount: formattedMessages.length, systemPromptLength: systemPrompt.length }, 'Calling streamText');

        let fullResponse = '';
        try {
          const stream = await streamText({
            model: gateway('openai/gpt-4o-mini'),
            system: systemPrompt,
            messages: formattedMessages,
          });

          // Stream tokens
          for await (const chunk of stream.textStream) {
            fullResponse += chunk;
            reply.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          }
        } catch (aiError) {
          app.logger.warn({ err: aiError, userId: session.user.id }, 'AI gateway error, using fallback for stream');
          // Fallback response for AI errors
          fullResponse = "I appreciate you reaching out. I'm here to help you navigate your dating journey. What specific question or situation would you like to discuss?";
          reply.raw.write(`data: ${JSON.stringify({ token: fullResponse })}\n\n`);
        }

        // Save messages after streaming completes
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        if (lastUserMsg) {
          await app.db.insert(schema.chatMessages).values({
            userId: session.user.id,
            personId: person_id ? person_id : undefined,
            role: 'user',
            content: lastUserMsg.content,
          });
        }

        await app.db.insert(schema.chatMessages).values({
          userId: session.user.id,
          personId: person_id ? person_id : undefined,
          role: 'assistant',
          content: fullResponse,
        });

        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();

        app.logger.info({ userId: session.user.id, personId: person_id }, 'AI stream completed');
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: person_id, messages: messages.length }, 'Failed to stream AI response');
        reply.raw.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        reply.raw.end();
      }
    }
  );
}
