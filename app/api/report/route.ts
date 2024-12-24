import { NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { reportContentRatelimit } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { selectedResults, prompt } = body

    const { success } = await reportContentRatelimit.limit('report')
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const systemPrompt = `Create a detailed report based on ${prompt}.

Leverage the following sources:
${selectedResults
  .map(
    (result: any, index: number) => `
Source ${index + 1}: ${result.title}
URL: ${result.url}
Content: ${result.content}
`
  )
  .join('\n')}

Generate a comprehensive report with:
1. A clear title
2. An executive summary
3. Multiple sections analyzing the content
4. Citations where appropriate

Important: Your response must be a valid JSON object with this exact structure:
{
  "title": "Report title",
  "summary": "Executive summary",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content"
    }
  ]
}`

    console.log('Sending prompt to Gemini:', systemPrompt)

    try {
      const result = await geminiModel.generateContent(systemPrompt)
      const response = result.response.text()
      // console.log('Raw Gemini response:', response)

      // Extract JSON using regex
      const jsonMatch = response.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonMatch) {
        console.error('No JSON found in response')
        return NextResponse.json(
          { error: 'Invalid report format' },
          { status: 500 }
        )
      }

      try {
        const reportData = JSON.parse(jsonMatch)
        console.log('Parsed report data:', reportData)
        return NextResponse.json(reportData)
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return NextResponse.json(
          { error: 'Failed to parse report format' },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Gemini generation error:', error)
      return NextResponse.json(
        { error: 'Failed to generate report content' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
