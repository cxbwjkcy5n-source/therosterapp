import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, isNull, and, gt, desc, sql, lte } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema/schema.js';

// Module-level zodiac compatibility cache
const zodiacCache = new Map<string, any>();

export function registerInsightRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/roster-health
  app.fastify.get(
    '/api/roster-health',
    {
      schema: {
        description: 'Get roster health score and insights',
        tags: ['insights'],
        response: {
          200: {
            type: 'object',
            properties: {
              score: { type: 'integer' },
              grade: { type: 'string' },
              summary: { type: 'string' },
              insights: { type: 'array', items: { type: 'string' } },
              breakdown: {
                type: 'object',
                properties: {
                  size_score: { type: 'integer' },
                  engagement_score: { type: 'integer' },
                  quality_score: { type: 'integer' },
                  balance_score: { type: 'integer' },
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

      app.logger.info({ userId: session.user.id }, 'Computing roster health');

      try {
        // Fetch active persons
        const persons = await app.db
          .select()
          .from(schema.persons)
          .where(
            and(
              eq(schema.persons.userId, session.user.id),
              eq(schema.persons.isBenched, false),
              isNull(schema.persons.archivedAt)
            )
          );

        // Fetch dates
        const dates = await app.db
          .select()
          .from(schema.dates)
          .where(eq(schema.dates.userId, session.user.id));

        // Fetch interactions
        const interactions = await app.db
          .select()
          .from(schema.interactions)
          .where(eq(schema.interactions.userId, session.user.id));

        const personCount = persons.length;

        // Size score
        let sizeScore = 60;
        if (personCount === 0) sizeScore = 60;
        else if (personCount === 1) sizeScore = 80;
        else if (personCount >= 2 && personCount <= 5) sizeScore = 100;
        else if (personCount >= 6 && personCount <= 8) sizeScore = 80;
        else sizeScore = 60;

        // Engagement score
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        let contactedIn14Days = 0;
        for (const person of persons) {
          let isContacted = false;

          // Check last_contacted_at
          if (person.lastContactedAt && person.lastContactedAt >= twoWeeksAgo) {
            isContacted = true;
          } else {
            // Check interactions
            const recentInteraction = interactions.find(
              (i) => i.personId === person.id && i.occurredAt >= twoWeeksAgo
            );
            if (recentInteraction) {
              isContacted = true;
            }
          }

          if (isContacted) contactedIn14Days++;
        }

        const engagementScore = personCount > 0 ? Math.round((contactedIn14Days / personCount) * 100) : 50;

        // Quality score
        let avgCompatibilitySum = 0;
        let personWithRatingsCount = 0;

        for (const person of persons) {
          const ratingValues = [
            person.attractiveness,
            person.communication,
            person.sexualChemistry,
            person.overallChemistry,
            person.consistency,
            person.emotionalAvailability,
            person.datePlanning,
            person.alignment,
            person.interestLevel,
          ].filter((v) => v !== null);

          if (ratingValues.length > 0) {
            const avg = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
            avgCompatibilitySum += avg;
            personWithRatingsCount++;
          }
        }

        let qualityScore = 50;
        if (personWithRatingsCount > 0) {
          const avgCompat = avgCompatibilitySum / personWithRatingsCount;
          qualityScore = Math.min(100, Math.round(avgCompat * 10));
        }

        // Balance score
        let balanceScore = 80;
        if (dates.length > 0) {
          const datesByPerson = new Map<string, number>();
          for (const d of dates) {
            datesByPerson.set(d.personId, (datesByPerson.get(d.personId) || 0) + 1);
          }

          const maxDates = Math.max(...datesByPerson.values());
          const percentOfMax = maxDates / dates.length;
          if (percentOfMax > 0.6) {
            balanceScore = 60;
          } else {
            balanceScore = 100;
          }
        }

        // Overall score
        const overallScore = Math.round(
          sizeScore * 0.2 + engagementScore * 0.3 + qualityScore * 0.3 + balanceScore * 0.2
        );

        // Grade
        let grade = 'F';
        if (overallScore >= 90) grade = 'A';
        else if (overallScore >= 75) grade = 'B';
        else if (overallScore >= 60) grade = 'C';
        else if (overallScore >= 45) grade = 'D';

        // Summary based on grade
        const summaryMap: Record<string, string> = {
          A: "Your roster is in excellent shape! You're managing your dating life like a pro.",
          B: "Your roster is healthy overall. A few tweaks could make it even better.",
          C: 'Your roster is doing okay, but there is room for improvement.',
          D: 'Your roster needs some attention. Focus on staying engaged and diversifying.',
          F: 'Your roster needs a major refresh. Time to reassess your strategy.',
        };
        const summary = summaryMap[grade] || summaryMap['F'];

        // Insights
        const insights: string[] = [];

        // Check for people not contacted
        const notContactedIn14 = persons.filter((p) => {
          if (p.lastContactedAt && p.lastContactedAt >= twoWeeksAgo) return false;
          const recentInteraction = interactions.find(
            (i) => i.personId === p.id && i.occurredAt >= twoWeeksAgo
          );
          return !recentInteraction;
        });

        if (notContactedIn14.length > 0) {
          insights.push(
            `You have ${notContactedIn14.length} person(s) you haven't contacted in 2+ weeks`
          );
        }

        if (qualityScore >= 75) {
          insights.push(`Your average compatibility score is ${Math.round(qualityScore / 10)}/10 — excellent!`);
        } else if (qualityScore < 50) {
          insights.push('Consider improving your ratings — your average compatibility is below 5/10');
        }

        const lowInterestPeople = persons.filter((p) => p.interestLevel !== null && p.interestLevel <= 3);
        if (lowInterestPeople.length > 0) {
          insights.push('Consider benching people with interest level below 4');
        }

        if (personCount === 0) {
          insights.push('Your roster is empty — add some people!');
        } else if (balanceScore === 60) {
          insights.push('Your dates are concentrated on one person — consider diversifying');
        }

        if (engagementScore >= 80) {
          insights.push("Great engagement — you're staying in touch with your roster");
        }

        app.logger.info(
          { userId: session.user.id, score: overallScore, grade },
          'Roster health computed'
        );

        return {
          score: overallScore,
          grade,
          summary,
          insights: insights.slice(0, 4),
          breakdown: {
            size_score: sizeScore,
            engagement_score: engagementScore,
            quality_score: qualityScore,
            balance_score: balanceScore,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to compute roster health');
        throw error;
      }
    }
  );

  // POST /api/ai/patterns
  app.fastify.post(
    '/api/ai/patterns',
    {
      schema: {
        description: 'Analyze dating patterns using AI',
        tags: ['ai', 'insights'],
        response: {
          200: {
            type: 'object',
            properties: {
              patterns: { type: 'array', items: { type: 'object' } },
              summary: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Analyzing dating patterns');

      try {
        // Fetch all persons
        const persons = await app.db
          .select()
          .from(schema.persons)
          .where(eq(schema.persons.userId, session.user.id));

        if (persons.length < 3) {
          app.logger.info({ userId: session.user.id }, 'Not enough persons for pattern analysis');
          return {
            patterns: [],
            summary: 'Add more people to your roster to unlock pattern insights.',
          };
        }

        // Fetch date counts
        const dateData = await app.db
          .select({ personId: schema.dates.personId, count: sql<number>`COUNT(*)` })
          .from(schema.dates)
          .where(eq(schema.dates.userId, session.user.id))
          .groupBy(schema.dates.personId);

        const datesByPerson = new Map(dateData.map((d) => [d.personId, d.count]));

        // Build roster data JSON
        const rosterData = persons.map((p, idx) => ({
          id: `Person ${idx + 1}`,
          ratings: {
            attractiveness: p.attractiveness,
            communication: p.communication,
            sexual_chemistry: p.sexualChemistry,
            overall_chemistry: p.overallChemistry,
            consistency: p.consistency,
            emotional_availability: p.emotionalAvailability,
            date_planning: p.datePlanning,
            alignment: p.alignment,
            interest_level: p.interestLevel,
          },
          red_flags: p.redFlags || [],
          green_flags: p.greenFlags || [],
          hobbies: p.hobbies || [],
          career: p.career || 'unknown',
          connection_type: p.connectionType || 'unknown',
          zodiac: p.zodiac || 'unknown',
          date_count: datesByPerson.get(p.id) || 0,
        }));

        const prompt = `You are a dating coach analyzing someone's dating patterns. Here is their roster data (names anonymized):

${JSON.stringify(rosterData, null, 2)}

Analyze this data and identify 3-5 meaningful patterns. For each pattern provide:
- type: one of "attraction", "gap", "strength", "warning", "trend"
- title: short title (5-8 words)
- description: 1-2 sentences with specific data points
- insight: 1-2 sentences of actionable advice

Also provide a 2-sentence overall summary.

Respond with valid JSON only:
{
  "patterns": [{"type": "...", "title": "...", "description": "...", "insight": "..."}],
  "summary": "..."
}`;

        app.logger.debug({ userId: session.user.id, personCount: persons.length }, 'Calling AI for pattern analysis');

        const { text } = await generateText({
          model: gateway('google/gemini-2.0-flash-001'),
          prompt,
          temperature: 0.7,
        });

        // Parse JSON response
        let jsonStr = text;
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0];
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0];
        }

        const result = JSON.parse(jsonStr.trim());
        app.logger.info({ userId: session.user.id, patternCount: result.patterns.length }, 'Patterns analyzed');
        return result;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to analyze patterns');
        return {
          patterns: [],
          summary: 'Unable to analyze patterns at this time.',
        };
      }
    }
  );

  // POST /api/persons/:personId/date-ideas
  app.fastify.post(
    '/api/persons/:personId/date-ideas',
    {
      schema: {
        description: 'Generate date ideas for a person using AI',
        tags: ['ai', 'dates'],
        params: {
          type: 'object',
          required: ['personId'],
          properties: {
            personId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            past_dates: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ideas: { type: 'array', items: { type: 'object' } },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { personId: string };
        Body: { past_dates?: string[] };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { personId } = request.params;
      const { past_dates = [] } = request.body;
      app.logger.info({ userId: session.user.id, personId }, 'Generating date ideas');

      try {
        // Verify person belongs to user
        const person = await app.db.query.persons.findFirst({
          where: and(eq(schema.persons.id, personId), eq(schema.persons.userId, session.user.id)),
        });

        if (!person) {
          app.logger.warn({ userId: session.user.id, personId }, 'Person not found');
          return reply.status(404).send({ error: 'Person not found' });
        }

        // Fetch recent dates
        const recentDates = await app.db
          .select({ title: schema.dates.title })
          .from(schema.dates)
          .where(and(eq(schema.dates.personId, personId), eq(schema.dates.userId, session.user.id)))
          .limit(10);

        const allPastDates = [...past_dates, ...recentDates.map((d) => d.title)];

        const prompt = `Generate 5 creative date ideas for someone with these details:
- Hobbies: ${person.hobbies?.join(', ') || 'not specified'}
- Favorite foods: ${person.favoriteFoods?.join(', ') || 'not specified'}
- Location: ${person.location}
- Career: ${person.career || 'not specified'}
- Connection type: ${person.connectionType || 'not specified'}
- Past dates already done: ${allPastDates.join(', ') || 'none'}

For each idea provide:
- title: short name
- description: 1-2 sentences explaining why it fits this person
- vibe: one of "fun", "romantic", "casual", "adventurous", "intimate"
- cost: one of "$", "$$", "$$$"

Respond with valid JSON only: { "ideas": [...] }`;

        app.logger.debug({ userId: session.user.id, personId }, 'Calling AI for date ideas');

        const { text } = await generateText({
          model: gateway('google/gemini-2.0-flash-001'),
          prompt,
          temperature: 0.8,
        });

        // Parse JSON response
        let jsonStr = text;
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0];
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0];
        }

        const result = JSON.parse(jsonStr.trim());
        app.logger.info({ userId: session.user.id, personId, ideaCount: result.ideas.length }, 'Date ideas generated');
        return result;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId }, 'Failed to generate date ideas');
        return { ideas: [] };
      }
    }
  );

  // PATCH /api/persons/:id/last-contacted
  app.fastify.patch(
    '/api/persons/:id/last-contacted',
    {
      schema: {
        description: 'Update when a person was last contacted',
        tags: ['persons'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            occurred_at: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              person_id: { type: 'string' },
              last_contacted_at: { type: 'string', format: 'date-time' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { occurred_at?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { occurred_at } = request.body;
      const contactedAt = occurred_at ? new Date(occurred_at) : new Date();

      app.logger.info({ userId: session.user.id, personId: id }, 'Updating last contacted');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      try {
        await app.db
          .update(schema.persons)
          .set({ lastContactedAt: contactedAt, updatedAt: new Date() })
          .where(eq(schema.persons.id, id));

        app.logger.info({ userId: session.user.id, personId: id }, 'Last contacted updated');
        return { person_id: id, last_contacted_at: contactedAt.toISOString() };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: id }, 'Failed to update last contacted');
        throw error;
      }
    }
  );

  // GET /api/zodiac-compatibility
  app.fastify.get(
    '/api/zodiac-compatibility',
    {
      schema: {
        description: 'Get astrological compatibility between two zodiac signs',
        tags: ['zodiac'],
        querystring: {
          type: 'object',
          required: ['sign1', 'sign2'],
          properties: {
            sign1: {
              type: 'string',
              enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
            },
            sign2: {
              type: 'string',
              enum: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
            },
          },
        },
        response: {
          200: { type: 'object' },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { sign1: string; sign2: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      let { sign1, sign2 } = request.query as { sign1: string; sign2: string };

      if (!sign1 || !sign2) {
        app.logger.warn({ userId: session.user.id }, 'Missing zodiac signs');
        return reply.status(400).send({ error: 'sign1 and sign2 are required' });
      }

      sign1 = sign1.toLowerCase();
      sign2 = sign2.toLowerCase();

      app.logger.info({ userId: session.user.id, sign1, sign2 }, 'Getting zodiac compatibility');

      try {
        // Check cache using sorted pair
        const sortedKey = [sign1, sign2].sort().join('-');
        if (zodiacCache.has(sortedKey)) {
          app.logger.debug({ sign1, sign2 }, 'Zodiac compatibility cache hit');
          return zodiacCache.get(sortedKey);
        }

        const prompt = `Provide a detailed astrological compatibility analysis between ${sign1} and ${sign2}.

Respond with valid JSON only:
{
  "sign1": "${sign1}",
  "sign2": "${sign2}",
  "overall_score": <number 1-10>,
  "summary": "<2-3 sentence overview>",
  "dimensions": [
    { "name": "Emotional Connection", "score": <1-10>, "description": "<1-2 sentences>" },
    { "name": "Communication", "score": <1-10>, "description": "<1-2 sentences>" },
    { "name": "Trust", "score": <1-10>, "description": "<1-2 sentences>" },
    { "name": "Intimacy", "score": <1-10>, "description": "<1-2 sentences>" },
    { "name": "Long-term Potential", "score": <1-10>, "description": "<1-2 sentences>" }
  ],
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "challenges": ["<challenge1>", "<challenge2>"],
  "advice": "<2-3 sentences of practical advice>"
}`;

        app.logger.debug({ sign1, sign2 }, 'Calling AI for zodiac compatibility');

        let result;
        try {
          const { text } = await generateText({
            model: gateway('google/gemini-2.0-flash-001'),
            prompt,
            temperature: 0.6,
          });

          // Parse JSON response
          let jsonStr = text;
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0];
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0];
          }

          result = JSON.parse(jsonStr.trim());
        } catch (aiError) {
          app.logger.warn({ err: aiError, sign1, sign2 }, 'AI gateway error for zodiac, using fallback');
          // Fallback response for AI errors
          result = {
            sign1,
            sign2,
            overall_score: 6,
            summary: `A moderate compatibility between ${sign1} and ${sign2}. These signs have potential but will need to work through their differences.`,
            dimensions: [
              { name: 'Emotional Connection', score: 6, description: 'These signs have moderate emotional understanding and can connect on personal levels.' },
              { name: 'Communication', score: 6, description: 'Communication may require effort, but these signs can understand each other with patience.' },
              { name: 'Trust', score: 6, description: 'Trust can be built through consistent actions and clear intentions.' },
              { name: 'Intimacy', score: 6, description: 'Physical and emotional intimacy can be fulfilling with mutual effort.' },
              { name: 'Long-term Potential', score: 6, description: 'Long-term success depends on both partners commitment to growth and understanding.' },
            ],
            strengths: ['Potential for growth', 'Different perspectives', 'Complementary traits'],
            challenges: ['Understanding differences', 'Communication styles', 'Conflicting needs'],
            advice: 'Focus on clear communication and mutual respect. Celebrate differences rather than viewing them as obstacles. With effort and commitment, this pairing can develop into something meaningful.',
          };
        }

        zodiacCache.set(sortedKey, result);
        app.logger.info({ sign1, sign2 }, 'Zodiac compatibility retrieved');
        return result;
      } catch (error) {
        app.logger.error({ err: error, sign1, sign2 }, 'Failed to generate zodiac compatibility');
        return reply.status(500).send({ error: 'Failed to generate compatibility analysis' });
      }
    }
  );

  // GET /api/persons/archived
  app.fastify.get(
    '/api/persons/archived',
    {
      schema: {
        description: 'Get archived and benched persons with statistics',
        tags: ['persons'],
        response: {
          200: {
            type: 'object',
            properties: {
              persons: { type: 'array', items: { type: 'object' } },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching archived persons');

      try {
        const archivedPersons = await app.db
          .select()
          .from(schema.persons)
          .where(
            and(
              eq(schema.persons.userId, session.user.id),
              sql`(${schema.persons.isBenched} = true OR ${schema.persons.archivedAt} IS NOT NULL)`
            )
          );

        // Fetch dates and compute stats
        const dateData = await app.db
          .select({ personId: schema.dates.personId, count: sql<number>`COUNT(*)` })
          .from(schema.dates)
          .where(eq(schema.dates.userId, session.user.id))
          .groupBy(schema.dates.personId);

        const datesByPerson = new Map(dateData.map((d) => [d.personId, d.count]));

        const result = archivedPersons.map((person) => {
          const ratingValues = [
            person.attractiveness,
            person.communication,
            person.sexualChemistry,
            person.overallChemistry,
            person.consistency,
            person.emotionalAvailability,
            person.datePlanning,
            person.alignment,
            person.interestLevel,
          ].filter((v) => v !== null);

          const avgRating =
            ratingValues.length > 0
              ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
              : null;

          const daysOnRoster =
            Math.floor(
              (new Date(person.archivedAt || new Date()).getTime() - new Date(person.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            ) || 0;

          return {
            ...person,
            total_dates: datesByPerson.get(person.id) || 0,
            avg_rating: avgRating,
            days_on_roster: daysOnRoster,
          };
        });

        app.logger.info({ userId: session.user.id, count: result.length }, 'Archived persons fetched');
        return { persons: result };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch archived persons');
        throw error;
      }
    }
  );

  // POST /api/persons/:id/archive
  app.fastify.post(
    '/api/persons/:id/archive',
    {
      schema: {
        description: 'Archive a person',
        tags: ['persons'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              person: { type: 'object' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, personId: id }, 'Archiving person');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      try {
        const [updated] = await app.db
          .update(schema.persons)
          .set({ archivedAt: new Date(), isBenched: true, updatedAt: new Date() })
          .where(eq(schema.persons.id, id))
          .returning();

        app.logger.info({ userId: session.user.id, personId: id }, 'Person archived');
        return { person: updated };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: id }, 'Failed to archive person');
        throw error;
      }
    }
  );

  // POST /api/persons/:id/unarchive
  app.fastify.post(
    '/api/persons/:id/unarchive',
    {
      schema: {
        description: 'Unarchive a person',
        tags: ['persons'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              person: { type: 'object' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, personId: id }, 'Unarchiving person');

      // Verify person belongs to user
      const person = await app.db.query.persons.findFirst({
        where: and(eq(schema.persons.id, id), eq(schema.persons.userId, session.user.id)),
      });

      if (!person) {
        app.logger.warn({ userId: session.user.id, personId: id }, 'Person not found');
        return reply.status(404).send({ error: 'Person not found' });
      }

      try {
        const [updated] = await app.db
          .update(schema.persons)
          .set({ archivedAt: null, isBenched: false, updatedAt: new Date() })
          .where(eq(schema.persons.id, id))
          .returning();

        app.logger.info({ userId: session.user.id, personId: id }, 'Person unarchived');
        return { person: updated };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, personId: id }, 'Failed to unarchive person');
        throw error;
      }
    }
  );

  // GET /api/benchmarks
  app.fastify.get(
    '/api/benchmarks',
    {
      schema: {
        description: 'Get anonymous benchmarks across all users',
        tags: ['insights'],
        response: {
          200: {
            type: 'object',
            properties: {
              avg_roster_size: { type: 'number' },
              most_valued_trait: { type: 'string' },
              avg_dates_before_bench: { type: 'number' },
              top_green_flags: { type: 'array', items: { type: 'string' } },
              top_red_flags: { type: 'array', items: { type: 'string' } },
              avg_compatibility_score: { type: 'number' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching benchmarks');

      try {
        // 1. Average roster size
        const rosterSizes = await app.db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(schema.persons)
          .where(and(eq(schema.persons.isBenched, false), isNull(schema.persons.archivedAt)))
          .groupBy(schema.persons.userId);

        const avgRosterSize =
          rosterSizes.length > 0
            ? Math.round((rosterSizes.reduce((sum, r) => sum + r.cnt, 0) / rosterSizes.length) * 10) / 10
            : 0;

        // 2. Most valued trait - compute averages for all rating columns
        const traitData = await app.db
          .select({
            attractiveness: schema.persons.attractiveness,
            communication: schema.persons.communication,
            sexualChemistry: schema.persons.sexualChemistry,
            overallChemistry: schema.persons.overallChemistry,
            consistency: schema.persons.consistency,
            emotionalAvailability: schema.persons.emotionalAvailability,
            datePlanning: schema.persons.datePlanning,
            alignment: schema.persons.alignment,
            interestLevel: schema.persons.interestLevel,
          })
          .from(schema.persons);

        const traitAverages: Record<string, number> = {};
        const traitNames: Array<keyof typeof traitData[0]> = [
          'attractiveness',
          'communication',
          'sexualChemistry',
          'overallChemistry',
          'consistency',
          'emotionalAvailability',
          'datePlanning',
          'alignment',
          'interestLevel',
        ];

        for (const trait of traitNames) {
          const values = traitData.map((r) => r[trait]).filter((v) => v !== null) as number[];
          const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          traitAverages[trait] = avg;
        }

        const traitFormatted: Record<string, string> = {
          attractiveness: 'Attractiveness',
          communication: 'Communication',
          sexualChemistry: 'Sexual Chemistry',
          overallChemistry: 'Overall Chemistry',
          consistency: 'Consistency',
          emotionalAvailability: 'Emotional Availability',
          datePlanning: 'Date Planning',
          alignment: 'Alignment',
          interestLevel: 'Interest Level',
        };

        let mostValuedTrait = 'Communication';
        let maxAvg = 0;
        for (const [trait, avg] of Object.entries(traitAverages)) {
          if (avg > maxAvg) {
            maxAvg = avg;
            mostValuedTrait = traitFormatted[trait] || trait;
          }
        }

        // 3. Average dates before bench
        const benchedPersons = await app.db
          .select({ personId: schema.persons.id })
          .from(schema.persons)
          .where(eq(schema.persons.isBenched, true));

        let totalDatesBeforeBench = 0;
        for (const p of benchedPersons) {
          const count = await app.db
            .select({ cnt: sql<number>`COUNT(*)` })
            .from(schema.dates)
            .where(eq(schema.dates.personId, p.personId));

          totalDatesBeforeBench += count[0]?.cnt || 0;
        }

        const avgDatesBeforeBench =
          benchedPersons.length > 0
            ? Math.round((totalDatesBeforeBench / benchedPersons.length) * 10) / 10
            : 0;

        // 4. Top green flags
        const allPersons = await app.db.select().from(schema.persons);
        const greenFlagCounts = new Map<string, number>();
        for (const p of allPersons) {
          if (p.greenFlags) {
            for (const flag of p.greenFlags) {
              const lower = flag.toLowerCase();
              greenFlagCounts.set(lower, (greenFlagCounts.get(lower) || 0) + 1);
            }
          }
        }

        const topGreenFlags = Array.from(greenFlagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([flag]) => flag);

        // 5. Top red flags
        const redFlagCounts = new Map<string, number>();
        for (const p of allPersons) {
          if (p.redFlags) {
            for (const flag of p.redFlags) {
              const lower = flag.toLowerCase();
              redFlagCounts.set(lower, (redFlagCounts.get(lower) || 0) + 1);
            }
          }
        }

        const topRedFlags = Array.from(redFlagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([flag]) => flag);

        // 6. Average compatibility score
        let compatSum = 0;
        let compatCount = 0;
        for (const p of allPersons) {
          const ratingValues = [
            p.attractiveness,
            p.communication,
            p.sexualChemistry,
            p.overallChemistry,
            p.consistency,
            p.emotionalAvailability,
            p.datePlanning,
            p.alignment,
            p.interestLevel,
          ].filter((v) => v !== null);

          if (ratingValues.length > 0) {
            const avg = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
            compatSum += avg;
            compatCount++;
          }
        }

        const avgCompatibilityScore =
          compatCount > 0 ? Math.round((compatSum / compatCount) * 10) / 10 : 0;

        app.logger.info({ userId: session.user.id }, 'Benchmarks computed');

        return {
          avg_roster_size: avgRosterSize,
          most_valued_trait: mostValuedTrait,
          avg_dates_before_bench: avgDatesBeforeBench,
          top_green_flags: topGreenFlags,
          top_red_flags: topRedFlags,
          avg_compatibility_score: avgCompatibilityScore,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch benchmarks');
        throw error;
      }
    }
  );
}
