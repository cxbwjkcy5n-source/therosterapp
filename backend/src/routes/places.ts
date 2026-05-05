import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function registerPlacesRoutes(app: App) {
  // GET /api/places/autocomplete - Get place autocomplete suggestions from Nominatim
  app.fastify.get(
    '/api/places/autocomplete',
    {
      schema: {
        description: 'Get place autocomplete suggestions from Nominatim (OpenStreetMap)',
        tags: ['places'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', description: 'Search query' },
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
      request: FastifyRequest<{ Querystring: { q?: string } }>,
      reply: FastifyReply
    ) => {
      const { q } = request.query;

      app.logger.info({ query: q }, 'Getting place autocomplete suggestions');

      // Check if query is provided
      if (!q || q.trim() === '') {
        app.logger.warn({}, 'q parameter is required');
        return {
          predictions: [],
        };
      }

      try {
        const encodedQuery = encodeURIComponent(q);

        // Call Nominatim API
        const urlString = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1`;

        app.logger.info({ query: q, url: urlString }, 'Calling Nominatim API');

        const response = await fetch(urlString, {
          headers: {
            'User-Agent': 'TheRosterApp/1.0',
            'Accept-Language': 'en',
          },
        });

        if (!response.ok) {
          app.logger.warn({ query: q, statusCode: response.status }, 'Nominatim API error');
          return {
            predictions: [],
          };
        }

        const data = (await response.json()) as NominatimResult[];

        app.logger.info({ query: q, resultCount: data.length }, 'Nominatim API response received');

        if (!Array.isArray(data) || data.length === 0) {
          app.logger.info({ query: q }, 'No results from Nominatim API');
          return {
            predictions: [],
          };
        }

        // Transform results to predictions format (up to 5 results)
        const predictions: Prediction[] = data.slice(0, 5).map((result: NominatimResult) => {
          let mainText: string;
          let secondaryText: string;

          // Extract main text from address components or display_name
          if (result.address?.city) {
            mainText = result.address.city;
          } else if (result.address?.town) {
            mainText = result.address.town;
          } else if (result.address?.village) {
            mainText = result.address.village;
          } else if (result.address?.county) {
            mainText = result.address.county;
          } else {
            // Fallback to first part of display_name
            mainText = result.display_name.split(',')[0].trim();
          }

          // Extract secondary text from state and country
          const state = result.address?.state;
          const country = result.address?.country;
          secondaryText = [state, country].filter(Boolean).join(', ');

          return {
            place_id: String(result.place_id),
            description: result.display_name,
            structured_formatting: {
              main_text: mainText,
              secondary_text: secondaryText,
            },
          };
        });

        app.logger.info({ query: q, count: predictions.length }, 'Place predictions retrieved');

        return {
          predictions,
        };
      } catch (error) {
        app.logger.error({ err: error, query: q }, 'Failed to get place autocomplete');
        return {
          predictions: [],
        };
      }
    }
  );
}
