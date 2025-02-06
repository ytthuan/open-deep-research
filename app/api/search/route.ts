import { NextResponse } from 'next/server'
import { searchRatelimit } from '@/lib/redis'
import { CONFIG } from '@/lib/config'

const GOOGLE_SEARCH_ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

type TimeFilter = '24h' | 'week' | 'month' | 'year' | 'all'

/**
 * Converts the timeFilter into a format that can be used with Google's dateRestrict parameter.
 * For example, '24h' becomes 'd1', 'week' becomes 'w1', etc.
 */
function getDateRestrict(timeFilter: TimeFilter): string | null {
  switch (timeFilter) {
    case '24h':
      return 'd1'
    case 'week':
      return 'w1'
    case 'month':
      return 'm1'
    case 'year':
      return 'y1'
    default:
      return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, timeFilter = 'all' } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Check rate limit if enabled
    if (CONFIG.rateLimits.enabled) {
      const { success } = await searchRatelimit.limit(query)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          { status: 429 }
        )
      }
    }

    const subscriptionKey = process.env.GOOGLE_SEARCH_API
    const google_cx = process.env.GOOGLE_CX
    if (!subscriptionKey || !google_cx) {
      return NextResponse.json(
        { error: 'Search API is not properly configured. Please check your environment variables.' },
        { status: 500 }
      )
    }
    

    // Build the query parameters for Google Custom Search API.
    const params = new URLSearchParams({
      q: query,
      key: subscriptionKey,
      cx: google_cx,
      num: CONFIG.search.resultsPerPage.toString(),
    })

    // If a time filter is specified (other than 'all'), add the dateRestrict parameter.
    const dateRestrict = getDateRestrict(timeFilter as TimeFilter)
    if (dateRestrict) {
      params.append('dateRestrict', dateRestrict)
    }

    // Send the request to Google Custom Search API.
    const response = await fetch(`${GOOGLE_SEARCH_ENDPOINT}?${params.toString()}`)

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Monthly search quota exceeded. Please try again next month or contact support for increased limits.' },
          { status: 403 }
        )
      }
      // Google errors are usually nested inside an "error" object.
      const errorData = await response.json().catch(() => null)
      return NextResponse.json(
        { error: errorData?.error?.message || `Search API returned error ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    // Map the raw items into a simplified structure
    const timestamp = Date.now()
    const results = (data.items || []).map((result: any) => ({
      id: `search-${timestamp}-${result.link}`,
      name: result.title,
      snippet: result.snippet,
      url: result.link,
    }))

    // Return only the array of search results.
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'An unexpected error occurred while fetching search results'
      },
      { status: 500 }
    )
  }
}