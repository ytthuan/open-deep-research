import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  DynamicRetrievalMode,
} from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const genAIPaid = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_PAID || '')

const generationConfigJson = {
  temperature: 1,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
}

const generationConfigText = {
  temperature: 1,
  maxOutputTokens: 8192,
  responseMimeType: 'text/plain',
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

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  safetySettings,
  generationConfig: generationConfigJson,
})
