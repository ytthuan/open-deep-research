'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, FileText, Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Report } from '@/types'

const timeFilters = [
  { value: 'all', label: 'Any time' },
  { value: '24h', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
] as const

export default function Home() {
  const [query, setQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [reportPrompt, setReportPrompt] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [activeTab, setActiveTab] = useState('search')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setSelectedResults([])
    setReportPrompt('')
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, timeFilter }),
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.')
        }
        throw new Error('Search failed. Please try again.')
      }

      const data = await response.json()
      setResults(data.webPages?.value || [])
    } catch (error) {
      console.error('Search failed:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResultSelect = (resultId: string) => {
    setSelectedResults((prev) => {
      if (prev.includes(resultId)) {
        return prev.filter((id) => id !== resultId)
      }
      return [...prev, resultId]
    })
  }

  const handleGenerateReport = async () => {
    if (!reportPrompt || selectedResults.length === 0) return

    setGeneratingReport(true)
    setError(null)
    try {
      const selectedArticles = results.filter((r) =>
        selectedResults.includes(r.id)
      )

      // Fetch content for each URL
      const contentResults = []
      let hitRateLimit = false

      for (const article of selectedArticles) {
        try {
          const response = await fetch('/api/fetch-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: article.url }),
          })

          if (response.ok) {
            const { content } = await response.json()
            contentResults.push({
              url: article.url,
              title: article.name,
              content: content,
            })
          } else if (response.status === 429) {
            hitRateLimit = true
            // Create a friendly report for rate limit
            setReport({
              title: "Rate Limit Reached",
              summary: "You've reached the rate limit for report generation. This helps us ensure fair usage of the service.",
              sections: [
                {
                  title: "What this means",
                  content: "To prevent abuse and ensure everyone can use the service fairly, we limit how many reports can be generated in a short time period."
                },
                {
                  title: "What you can do",
                  content: "Please wait a moment before generating another report. You can continue browsing search results or refine your selection in the meantime."
                },
                {
                  title: "Why we do this",
                  content: "Rate limiting helps us maintain service quality and availability for all users while keeping the service free and accessible."
                }
              ]
            })
            setActiveTab('report')
            throw new Error('Rate limit exceeded. Please wait a moment before generating another report.')
          } else {
            console.warn(`Failed to fetch content for ${article.url}, using snippet`)
            contentResults.push({
              url: article.url,
              title: article.name,
              content: article.snippet,
            })
          }
        } catch (error) {
          if (hitRateLimit) throw error
          console.warn(`Error fetching ${article.url}, using snippet:`, error)
          contentResults.push({
            url: article.url,
            title: article.name,
            content: article.snippet,
          })
        }
      }

      if (contentResults.length === 0) {
        throw new Error('Failed to fetch content for any of the selected articles')
      }

      // Only proceed with report generation if we haven't hit rate limit
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedResults: contentResults,
          prompt: reportPrompt,
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          // Create a friendly report for rate limit
          setReport({
            title: "Rate Limit Reached",
            summary: "You've reached the rate limit for report generation. This helps us ensure fair usage of the service.",
            sections: [
              {
                title: "What this means",
                content: "To prevent abuse and ensure everyone can use the service fairly, we limit how many reports can be generated in a short time period."
              },
              {
                title: "What you can do",
                content: "Please wait a moment before generating another report. You can continue browsing search results or refine your selection in the meantime."
              },
              {
                title: "Why we do this",
                content: "Rate limiting helps us maintain service quality and availability for all users while keeping the service free and accessible."
              }
            ]
          })
          setActiveTab('report')
          throw new Error('Rate limit exceeded. Please wait a moment before generating another report.')
        }
        throw new Error('Failed to generate report. Please try again.')
      }

      const data = await response.json()
      console.log('Report data:', data)
      setReport(data)
      setActiveTab('report')
    } catch (error) {
      console.error('Report generation failed:', error)
      setError(error instanceof Error ? error.message : 'Report generation failed')
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleDownload = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!report) return

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report,
          format,
        }),
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className='min-h-screen bg-white p-4 sm:p-8'>
      <main className='max-w-4xl mx-auto'>
        {error && (
          <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-center'>
            {error}
          </div>
        )}
        
        <div className='mb-8'>
          <h1 className='text-3xl font-bold mb-2 text-center text-gray-800'>
            Open Deep Research
          </h1>
          <p className='text-center text-gray-600 mb-6'>
            Open source alternative to Gemini Deep Research. Generate reports
            with AI based on search results.
          </p>
          <form onSubmit={handleSearch} className='space-y-4'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='relative flex-1'>
                <Input
                  type='text'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Enter your search query...'
                  className='pr-8'
                />
                <Search className='absolute right-2 top-2 h-5 w-5 text-gray-400' />
              </div>

              <div className='flex gap-2'>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className='w-full sm:w-[140px] sm:shrink-0'>
                    <SelectValue placeholder='Select time range' />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type='submit'
                  disabled={loading}
                  className='shrink-0 flex-1 sm:flex-initial'
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <div className='mb-6 space-y-4'>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='relative flex-1'>
                  <Input
                    type='text'
                    value={reportPrompt}
                    onChange={(e) => setReportPrompt(e.target.value)}
                    placeholder="Enter report prompt (e.g., 'Compare pros and cons')"
                    className='pr-8'
                    disabled={selectedResults.length === 0}
                  />
                  <FileText className='absolute right-2 top-2.5 h-5 w-5 text-gray-400' />
                </div>
                <Button
                  onClick={handleGenerateReport}
                  disabled={
                    selectedResults.length === 0 ||
                    !reportPrompt ||
                    generatingReport
                  }
                  variant='secondary'
                  className='w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300'
                >
                  {generatingReport ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
              <p className='text-sm text-gray-600 text-center sm:text-left'>
                {selectedResults.length === 0
                  ? 'Select results to generate a report'
                  : `${selectedResults.length} result${
                      selectedResults.length === 1 ? '' : 's'
                    } selected`}
              </p>
            </div>

            <TabsList className='grid w-full grid-cols-2 mb-4'>
              <TabsTrigger value='search'>Search Results</TabsTrigger>
              <TabsTrigger value='report' disabled={!report}>
                Report
              </TabsTrigger>
            </TabsList>

            <TabsContent value='search' className='space-y-4'>
              {results.map((result) => (
                <Card key={result.id} className='overflow-hidden'>
                  <CardContent className='p-4 flex gap-4'>
                    <div className='pt-1'>
                      <Checkbox
                        checked={selectedResults.includes(result.id)}
                        onCheckedChange={() => handleResultSelect(result.id)}
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <a
                        href={result.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline'
                      >
                        <h2
                          className='text-xl font-semibold truncate'
                          dangerouslySetInnerHTML={{ __html: result.name }}
                        />
                      </a>
                      <p className='text-green-700 text-sm truncate'>
                        {result.url}
                      </p>
                      <p
                        className='mt-1 text-gray-600 line-clamp-2'
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value='report'>
              {report && (
                <Card>
                  <CardContent className='p-6 space-y-6'>
                    <div className='flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-4'>
                      <h2 className='text-2xl font-bold text-gray-800 text-center sm:text-left'>
                        {report.title}
                      </h2>
                      <div className='w-full sm:w-auto'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant='outline' 
                              size='sm' 
                              className='w-full sm:w-auto gap-2'
                            >
                              <Download className='h-4 w-4' />
                              Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                              Download as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload('docx')}>
                              Download as Word
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload('txt')}>
                              Download as Text
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className='text-lg text-gray-700'>{report.summary}</p>
                    {report.sections.map((section, index) => (
                      <div key={index} className='space-y-2 border-t pt-4'>
                        <h3 className='text-xl font-semibold text-gray-700'>
                          {section.title}
                        </h3>
                        <p className='text-gray-600'>{section.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
