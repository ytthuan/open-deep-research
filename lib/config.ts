export const CONFIG = {
  // Rate limits (requests per minute)
  rateLimits: {
    search: 5,
    contentFetch: 20,
    reportGeneration: 5,
  },

  // Search settings
  search: {
    resultsPerPage: 10,
    maxSelectableResults: 3,
    safeSearch: 'Moderate' as const,
    market: 'en-US',
  },
} as const
