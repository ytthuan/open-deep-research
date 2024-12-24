import { NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { reportContentRatelimit } from '@/lib/redis'
import { type Article } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { selectedResults, prompt } = body

    const { success } = await reportContentRatelimit.limit('report')
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const generateSystemPrompt = (articles: Article[], userPrompt: string) => {
      return `You are a research assistant tasked with creating a comprehensive report based on the following sources. 
The report should specifically address this request: "${userPrompt}"

Your report should:
1. Have a clear title that reflects the specific analysis requested
2. Begin with a concise executive summary
3. Be organized into relevant sections based on the analysis requested
4. Cite information from the provided sources where appropriate
5. Maintain objectivity while addressing the specific aspects requested in the prompt

Here are the source articles to analyze:

${articles.map((article, index) => `
Source ${index + 1}: ${article.title}
URL: ${article.url}
Content: ${article.content}
`).join('\n')}

Format the report as a JSON object with the following structure:
{
  "title": "Report title",
  "summary": "Executive summary",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content"
    }
  ]
}

Ensure the report is comprehensive and flexible enough to accommodate various types of analysis as requested in the prompt.`
    }

    const systemPrompt = generateSystemPrompt(selectedResults, prompt)

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
