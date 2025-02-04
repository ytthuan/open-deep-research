import { NextResponse } from 'next/server'
import { searchRatelimit } from '@/lib/redis'
import { CONFIG } from '@/lib/config'
const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search'

type TimeFilter = '24h' | 'week' | 'month' | 'year' | 'all'

function getFreshness(timeFilter: TimeFilter): string {
  switch (timeFilter) {
    case '24h':
      return 'Day'
    case 'week':
      return 'Week'
    case 'month':
      return 'Month'
    case 'year':
      return 'Year'
    default:
      return ''
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

    // Only check rate limit if enabled
    if (CONFIG.rateLimits.enabled) {
      const { success } = await searchRatelimit.limit(query)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          { status: 429 }
        )
      }
    }

    const subscriptionKey = process.env.AZURE_SUB_KEY
    if (!subscriptionKey) {
      return NextResponse.json(
        { error: 'Search API is not properly configured. Please check your environment variables.' },
        { status: 500 }
      )
    }

    const params = new URLSearchParams({
      q: query,
      count: CONFIG.search.resultsPerPage.toString(),
      mkt: CONFIG.search.market,
      safeSearch: CONFIG.search.safeSearch,
      textFormat: 'HTML',
      textDecorations: 'true',
    })

    // Add freshness parameter if a time filter is selected
    const freshness = getFreshness(timeFilter as TimeFilter)
    if (freshness) {
      params.append('freshness', freshness)
    }

    const response = await fetch(`${BING_ENDPOINT}?${params.toString()}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Accept-Language': 'en-US',
      },
    })

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Monthly search quota exceeded. Please try again next month or contact support for increased limits.' },
          { status: 403 }
        )
      }
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || `Search API returned error ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
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
