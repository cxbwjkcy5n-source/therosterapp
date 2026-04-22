import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface GeocodeFarmResult {
  result_number: number;
  formatted_address: string;
  ADDRESS?: {
    street_number?: string;
    street_name?: string;
    locality?: string;
    admin_1?: string;
    postal_code?: string;
  };
}

interface GeocodeFarmResponse {
  STATUS: {
    access: string;
  };
  RESULTS: GeocodeFarmResult[];
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

function hasGeocodeFarmKey(): boolean {
  return !!process.env.GEOCODE_FARM_API_KEY;
}

export function registerPlacesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/places/autocomplete - Get place autocomplete suggestions
  app.fastify.get(
    '/api/places/autocomplete',
    {
      schema: {
        description: 'Get place autocomplete suggestions from Geocode Farm API',
        tags: ['places'],
        querystring: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', description: 'Address text to search' },
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
      request: FastifyRequest<{ Querystring: { input?: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { input } = request.query;

      app.logger.info({ userId: session.user.id, input }, 'Getting place autocomplete suggestions');

      // Check if input is provided
      if (!input || input.trim() === '') {
        app.logger.warn({ userId: session.user.id }, 'input is required');
        return reply.status(400).send({ error: 'input is required' });
      }

      // If API key is not configured, return mock predictions for testing
      if (!hasGeocodeFarmKey()) {
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
          'Returning mock place predictions (GEOCODE_FARM_API_KEY not configured)'
        );
        return {
          predictions: mockPredictions,
        };
      }

      try {
        const apiKey = process.env.GEOCODE_FARM_API_KEY!;
        const encodedInput = encodeURIComponent(input);

        // Build Geocode Farm API URL
        const urlString = `https://www.geocode.farm/v3/json/forward/?addr=${encodedInput}&key=${apiKey}&country=US&count=5`;

        // Call Geocode Farm API
        const response = await fetch(urlString);
        const data = (await response.json()) as GeocodeFarmResponse;

        app.logger.info(
          { userId: session.user.id, status: data.STATUS.access },
          'Geocode Farm API response received'
        );

        // Check response status
        if (data.STATUS.access !== 'SUCCESS') {
          app.logger.info({ userId: session.user.id }, 'No results from Geocode Farm API');
          return {
            predictions: [],
          };
        }

        // Transform results to predictions format
        const predictions: Prediction[] = (data.RESULTS || []).map((result) => {
          let mainText: string;
          let secondaryText: string;

          if (result.ADDRESS) {
            // If ADDRESS fields exist, construct from components
            const streetNumber = result.ADDRESS.street_number || '';
            const streetName = result.ADDRESS.street_name || '';
            mainText = (streetNumber + ' ' + streetName).trim();

            const locality = result.ADDRESS.locality || '';
            const admin1 = result.ADDRESS.admin_1 || '';
            const postalCode = result.ADDRESS.postal_code || '';
            secondaryText = [locality, admin1, postalCode].filter(Boolean).join(', ');
          } else {
            // Otherwise split on first comma
            const parts = result.formatted_address.split(',');
            mainText = parts[0].trim();
            secondaryText = parts.slice(1).join(',').trim();
          }

          return {
            place_id: String(result.result_number),
            description: result.formatted_address,
            structured_formatting: {
              main_text: mainText,
              secondary_text: secondaryText,
            },
          };
        });

        app.logger.info(
          { userId: session.user.id, count: predictions.length },
          'Place predictions retrieved'
        );

        return {
          predictions,
        };
      } catch (error) {
        app.logger.error({ userId: session.user.id, err: error }, 'Failed to get place autocomplete');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
