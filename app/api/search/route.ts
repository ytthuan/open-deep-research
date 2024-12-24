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

    const { success } = await searchRatelimit.limit(query)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const subscriptionKey = process.env.AZURE_SUB_KEY
    if (!subscriptionKey) {
      return NextResponse.json(
        { error: 'Search API key not configured' },
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
      throw new Error(`Search API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    )
  }
}
