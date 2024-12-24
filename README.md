# Open Deep Research

<div align="center">
  <img src="demo.gif" alt="Open Deep Research Demo" width="800"/>
</div>

An open-source alternative to Gemini Deep Research, built to generate AI-powered reports from web search results with precision and efficiency.

This app functions in three key steps:

1. **Search Results Retrieval**: Using the Bing Search API, the app fetches comprehensive search results for the specified search term.
2. **Content Extraction**: Leveraging JinaAI, it retrieves and processes the contents of the selected search results, ensuring accurate and relevant information.
3. **Report Generation**: With the curated search results and extracted content, the app generates a detailed report tailored to your custom prompts, providing insightful and synthesized output.

Open Deep Research combines powerful tools to streamline research and report creation in a user-friendly, open-source platform. You can customize the app to your needs (change the model, prompt, update rate limits and number of results both fetched and selected etc.)

## Features

- 🔍 Web search with time filtering
- 📄 Content extraction from web pages
- 🤖 AI-powered report generation
- 📊 Multiple export formats (PDF, Word, Text)
- ⚡ Rate limiting for stability
- 📱 Responsive design

## Demo

Try it out at: [Open Deep Research](https://opendeepresearch.vercel.app/)

## Configuration

The app's settings can be customized through the configuration file at `lib/config.ts`. Here are the key parameters you can adjust:

### Rate Limits

Control the number of requests allowed per minute for different operations:

```typescript
rateLimits: {
  search: 5,            // Search requests per minute
  contentFetch: 20,     // Content fetch requests per minute
  reportGeneration: 5,  // Report generation requests per minute
}
```

### Search Settings

Customize the search behavior:

```typescript
search: {
  resultsPerPage: 10,           // Number of search results to fetch
  maxSelectableResults: 3,      // Maximum results users can select for reports
  safeSearch: 'Moderate',       // SafeSearch setting ('Off', 'Moderate', 'Strict')
  market: 'en-US',             // Search market/region
}
```

To modify these settings, update the values in `lib/config.ts`. The changes will take effect after restarting the development server.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone https://github.com/btahir/open-deep-research
cd open-deep-research
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Create a `.env.local` file in the root directory:

```env
# Azure Bing Search API key (required for web search)
AZURE_SUB_KEY=your_azure_subscription_key

# Google Gemini Pro API key (required for AI report generation)
GEMINI_API_KEY=your_gemini_api_key

# Upstash Redis (required for rate limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Getting API Keys

#### Azure Bing Search API

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a Bing Search resource
3. Get the subscription key from "Keys and Endpoint"

#### Google Gemini Pro API

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy the API key

#### Upstash Redis

1. Sign up at [Upstash](https://upstash.com)
2. Create a new Redis database
3. Copy the REST URL and REST Token

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [JinaAI](https://jina.ai/) - Content extraction
- [Azure Bing Search](https://www.microsoft.com/en-us/bing/apis/bing-web-search-api) - Web search
- [Upstash Redis](https://upstash.com/) - Rate limiting
- [jsPDF](https://github.com/parallax/jsPDF) & [docx](https://github.com/dolanmiu/docx) - Document generation

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://github.com/btahir/open-deep-research/blob/main/LICENSE)

## Acknowledgments

- Inspired by Google's Gemini Deep Research feature
- Built with amazing open source tools and APIs
