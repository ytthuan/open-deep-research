import { NextResponse } from 'next/server'
import {
  geminiModel,
  geminiFlashModel,
  geminiFlashThinkingModel,
} from '@/lib/gemini'
import { reportContentRatelimit } from '@/lib/redis'
import { type Article } from '@/types'
import { CONFIG } from '@/lib/config'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

type PlatformModel =
  | 'google__gemini-flash'
  | 'google__gemini-flash-thinking'
  | 'google__gemini-exp'
  | 'gpt-4o'
  | 'o1-mini'
  | 'o1'
  | 'sonnet-3.5'
  | 'haiku-3.5'
  | 'deepseek__chat'
  | 'deepseek__reasoner'

type DeepSeekMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

async function generateWithGemini(systemPrompt: string, model: string) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 60000; // 1 minute in milliseconds
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      if (model === 'gemini-flash-thinking') {
        const result = await geminiFlashThinkingModel.generateContent(systemPrompt)
        return result.response.text()
      } else if (model === 'gemini-exp') {
        const result = await geminiModel.generateContent(systemPrompt) 
        return result.response.text()
      } else {
        const result = await geminiFlashModel.generateContent(systemPrompt)
        return result.response.text()
      }
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, (error as Error).message);

      // Check for specific error conditions
      
        
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`Rate limited or service overloaded. Waiting ${RETRY_DELAY/1000} seconds before retry ${retries}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
      
      
      // If we've exhausted retries or it's a different error, throw it
      throw new Error(`Gemini API error after ${retries} retries`);
    }
  }

  throw new Error('Max retries exceeded for Gemini API call');
}

async function generateWithOpenAI(systemPrompt: string, model: string) {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: systemPrompt,
      },
    ],
  })
  return response.choices[0].message.content
}

async function generateWithDeepSeek(systemPrompt: string, model: string) {
  try {
    // Initial message to start the conversation
    const messages: DeepSeekMessage[] = [
      {
        role: 'user',
        content: systemPrompt,
      },
    ]

    const response = await deepseek.chat.completions.create({
      model,
      messages: messages as any,
      max_tokens: 4000,
    })

    // Get the initial response
    const content = response.choices[0].message.content || ''

    // For the reasoner model, we can get additional reasoning content
    let reasoning = ''
    const messageWithReasoning = response.choices[0].message as any
    if (
      model === 'deepseek-reasoner' &&
      messageWithReasoning.reasoning_content
    ) {
      reasoning = messageWithReasoning.reasoning_content
      console.log('DeepSeek reasoning:', reasoning)
    }

    return content
  } catch (error) {
    console.error('DeepSeek API error:', error)
    throw error
  }
}

async function generateWithAnthropic(systemPrompt: string, model: string) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 3500,
    temperature: 0.9,
    messages: [
      {
        role: 'user',
        content: systemPrompt,
      },
    ],
  })
  return response.content[0].text || ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      selectedResults,
      sources,
      prompt,
      platformModel = 'google-gemini-flash',
    } = body as {
      selectedResults: Article[]
      sources: any[]
      prompt: string
      platformModel: PlatformModel
    }

    // Only check rate limit if enabled
    if (CONFIG.rateLimits.enabled) {
      const { success } = await reportContentRatelimit.limit('report')
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
      }
    }

    // Check if selected platform is enabled
    const platform = platformModel.split('__')[0]
    const model = platformModel.split('__')[1]

    const platformConfig =
      CONFIG.platforms[platform as keyof typeof CONFIG.platforms]
    if (!platformConfig?.enabled) {
      return NextResponse.json(
        { error: `${platform} platform is not enabled` },
        { status: 400 }
      )
    }

    // Check if selected model exists and is enabled
    const modelConfig = (platformConfig as any).models[model]
    if (!modelConfig) {
      return NextResponse.json(
        { error: `${model} model does not exist` },
        { status: 400 }
      )
    }
    if (!modelConfig.enabled) {
      return NextResponse.json(
        { error: `${model} model is disabled` },
        { status: 400 }
      )
    }

    const generateSystemPrompt = (articles: Article[], userPrompt: string) => {
      return `You are a research assistant tasked with creating a comprehensive report based on multiple sources. 
The report should specifically address this request: "${userPrompt}"

Your report should:
1. Have a clear title that reflects the specific analysis requested
2. Begin with a concise executive summary
3. Be organized into relevant sections based on the analysis requested
4. Use markdown formatting for emphasis, lists, and structure
5. Integrate information from sources naturally without explicitly referencing them by number
6. Maintain objectivity while addressing the specific aspects requested in the prompt
7. Compare and contrast the information from each source, noting areas of consensus or points of contention. 
8. Showcase key insights, important data, or innovative ideas.

Here are the source articles to analyze:

${articles
  .map(
    (article) => `
Title: ${article.title}
URL: ${article.url}
Content: ${article.content}
---
`
  )
  .join('\n')}

Format the report as a JSON object with the following structure:
{
  "title": "Report title",
  "summary": "Executive summary (can include markdown)",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content with markdown formatting"
    }
  ]
}

Use markdown formatting in the content to improve readability:
- Use **bold** for emphasis
- Use bullet points and numbered lists where appropriate
- Use headings and subheadings with # syntax
- Include code blocks if relevant
- Use > for quotations
- Use --- for horizontal rules where appropriate

Important: Do not use phrases like "Source 1" or "According to Source 2". Instead, integrate the information naturally into the narrative or reference sources by their titles when necessary. Use Vietnamese for your final report output`
    }

    const systemPrompt = generateSystemPrompt(selectedResults, prompt)

    // console.log('Sending prompt to model:', systemPrompt)
    console.log('Model:', model)

    try {
      let response: string | null = null
      switch (model) {
        case 'gemini-flash':
          response = await generateWithGemini(systemPrompt, 'gemini-flash')
          break
        case 'gemini-flash-thinking':
          response = await generateWithGemini(
            systemPrompt,
            'gemini-flash-thinking'
          )
          break
        case 'gemini-exp':
          response = await generateWithGemini(systemPrompt, 'gemini-exp')
          break
        case 'gpt-4o':
          response = await generateWithOpenAI(systemPrompt, 'gpt-4o')
          break
        case 'o1-mini':
          response = await generateWithOpenAI(systemPrompt, 'o1-mini')
          break
        case 'o1':
          response = await generateWithOpenAI(systemPrompt, 'o1')
          break
        case 'sonnet-3.5':
          response = await generateWithAnthropic(
            systemPrompt,
            'claude-3-5-sonnet-latest'
          )
          break
        case 'haiku-3.5':
          response = await generateWithAnthropic(
            systemPrompt,
            'claude-3-5-haiku-latest'
          )
          break
        case 'chat':
          response = await generateWithDeepSeek(systemPrompt, 'deepseek-chat')
          break
        case 'reasoner':
          response = await generateWithDeepSeek(
            systemPrompt,
            'deepseek-reasoner'
          )
          break
        default:
          throw new Error('Invalid platform/model combination')
      }

      if (!response) {
        throw new Error('No response from model')
      }

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
        // Add sources to the report data
        reportData.sources = sources
        // console.log('Parsed report data:', reportData)
        return NextResponse.json(reportData)
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return NextResponse.json(
          { error: 'Failed to parse report format' },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Model generation error:', error)
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
