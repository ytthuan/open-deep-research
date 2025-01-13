export const CONFIG = {
  // Rate limits (requests per minute)
  rateLimits: {
    enabled: true, // Flag to enable/disable rate limiting
    search: 2,
    contentFetch: 20,
    reportGeneration: 2,
  },

  // Search settings
  search: {
    resultsPerPage: 10,
    maxSelectableResults: 3,
    safeSearch: 'Moderate' as const,
    market: 'en-US',
  },

  // AI Platform settings
  platforms: {
    google: {
      enabled: true,
    },
    openai: {
      enabled: true,
    },
    anthropic: {
      enabled: true,
    },
  },
} as const
