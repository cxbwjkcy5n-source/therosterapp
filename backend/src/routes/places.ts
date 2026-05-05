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
            sessiontoken: { type: ['string', 'null'], description: 'Session token (ignored, for compatibility)' },
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
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { input?: string; sessiontoken?: string } }>,
      reply: FastifyReply
    ) => {
      const { input } = request.query;

      app.logger.info({ input }, 'Getting place autocomplete suggestions');

      // Check if input is provided
      if (!input || input.trim() === '') {
        app.logger.warn({}, 'input is required');
        return {
          predictions: [],
        };
      }

      // If API key is not configured, return empty predictions for testing
      if (!hasGeocodeFarmKey()) {
        app.logger.info({ input }, 'Returning empty predictions (GEOCODE_FARM_API_KEY not configured)');
        return {
          predictions: [],
        };
      }

      try {
        const apiKey = process.env.GEOCODE_FARM_API_KEY!;
        const encodedInput = encodeURIComponent(input);

        // Build Geocode Farm API URL
        const urlString = `https://api.geocode.farm/forward/?key=${apiKey}&addr=${encodedInput}&country=US&lang=en`;

        app.logger.info({ input, url: urlString }, 'Calling Geocode Farm API');

        // Call Geocode Farm API
        const response = await fetch(urlString);
        const data = (await response.json()) as any;

        app.logger.info({ input, status: data.geocoding_results?.RESULTS?.length }, 'Geocode Farm API response received');

        // Check if results exist
        if (!data.geocoding_results?.RESULTS || data.geocoding_results.RESULTS.length === 0) {
          app.logger.info({ input }, 'No results from Geocode Farm API');
          return {
            predictions: [],
          };
        }

        // Transform results to predictions format (up to 5 results)
        const predictions: Prediction[] = (data.geocoding_results.RESULTS || []).slice(0, 5).map((result: any) => {
          let mainText: string;
          let secondaryText: string;

          if (result.ADDRESS && result.ADDRESS.city) {
            // Use ADDRESS.city if present
            mainText = result.ADDRESS.city;
          } else {
            // Otherwise use first comma-separated part of formatted_address
            const parts = result.formatted_address.split(',');
            mainText = parts[0].trim();
          }

          if (result.ADDRESS && result.ADDRESS.admin_1 && result.ADDRESS.country) {
            // Use ADDRESS.admin_1 + ", " + ADDRESS.country if both present
            secondaryText = `${result.ADDRESS.admin_1}, ${result.ADDRESS.country}`;
          } else {
            // Otherwise use everything after first comma in formatted_address
            const parts = result.formatted_address.split(',');
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

        app.logger.info({ input, count: predictions.length }, 'Place predictions retrieved');

        return {
          predictions,
        };
      } catch (error) {
        app.logger.error({ err: error, input }, 'Failed to get place autocomplete');
        return {
          predictions: [],
        };
      }
    }
  );
}
