import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface GooglePlacesResponse {
  status: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text: string;
      secondary_text?: string;
    };
  }>;
}

function hasGooglePlacesKey(): boolean {
  return !!process.env.Google_Places_API_KEY;
}

export function registerPlacesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/places/autocomplete - Get place autocomplete suggestions
  app.fastify.get(
    '/api/places/autocomplete',
    {
      schema: {
        description: 'Get place autocomplete suggestions from Google Places API',
        tags: ['places'],
        querystring: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', description: 'Partial address text' },
            sessiontoken: { type: 'string', description: 'Optional session token for billing' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              predictions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    place_id: { type: 'string' },
                    description: { type: 'string' },
                    structured_formatting: {
                      type: 'object',
                      properties: {
                        main_text: { type: 'string' },
                        secondary_text: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
          502: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { input?: string; sessiontoken?: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { input, sessiontoken } = request.query;

      app.logger.info({ userId: session.user.id, input }, 'Getting place autocomplete suggestions');

      // Check if input is provided
      if (!input || input.trim() === '') {
        app.logger.warn({ userId: session.user.id }, 'input is required');
        return reply.status(400).send({ error: 'input is required' });
      }

      // If API key is not configured, return mock predictions for testing
      if (!hasGooglePlacesKey()) {
        const mockPredictions = [
          {
            place_id: 'mock_place_1',
            description: `${input} (mock)`,
            structured_formatting: {
              main_text: input,
              secondary_text: 'Mock Location',
            },
          },
          {
            place_id: 'mock_place_2',
            description: `${input} City (mock)`,
            structured_formatting: {
              main_text: `${input} City`,
              secondary_text: 'Mock State, Mock Country',
            },
          },
        ];
        app.logger.info(
          { userId: session.user.id, input },
          'Returning mock place predictions (Google_Places_API_KEY not configured)'
        );
        return {
          predictions: mockPredictions,
        };
      }

      try {
        const apiKey = process.env.Google_Places_API_KEY!;

        // Build Google Places API URL
        const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        url.searchParams.append('input', input);
        url.searchParams.append('key', apiKey);
        url.searchParams.append('types', 'address');
        if (sessiontoken) {
          url.searchParams.append('sessiontoken', sessiontoken);
        }

        // Call Google Places API
        const response = await fetch(url.toString());
        const data = (await response.json()) as GooglePlacesResponse;

        app.logger.info(
          { userId: session.user.id, status: data.status },
          'Google Places API response received'
        );

        // Check response status
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          app.logger.error({ userId: session.user.id, googleStatus: data.status }, 'Google Places API error');
          return reply.status(502).send({ error: data.status });
        }

        // Return predictions
        return {
          predictions: data.predictions || [],
        };
      } catch (error) {
        app.logger.error({ userId: session.user.id, err: error }, 'Failed to get place autocomplete');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
