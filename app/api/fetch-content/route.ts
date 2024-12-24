import { NextResponse } from 'next/server'
import { reportRatelimit } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const { success } = await reportRatelimit.limit(url)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    console.log('Fetching content for URL:', url)

    try {
      const response = await fetch(
        `https://r.jina.ai/${encodeURIComponent(url)}`
      )

      if (!response.ok) {
        console.warn(`Failed to fetch content for ${url}:`, response.status)
        return NextResponse.json(
          { error: 'Failed to fetch content' },
          { status: response.status }
        )
      }

      const content = await response.text()
      return NextResponse.json({ content })
    } catch (error) {
      console.warn(`Error fetching content for ${url}:`, error)
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Content fetching error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
