import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const generationConfig = {
  temperature: 1,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
}

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
]

export const geminiFlashModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  safetySettings,
  generationConfig: generationConfig,
})

export const geminiFlashThinkingModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-thinking-exp-1219',
  safetySettings,
  generationConfig: generationConfig,
})

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-exp-1206',
  safetySettings,
  generationConfig: generationConfig,
})
