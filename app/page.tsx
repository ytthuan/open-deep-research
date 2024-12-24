'use client';
import { useState } from 'react';
import Image from 'next/image';

const timeFilters = [
  { value: 'all', label: 'Any time' },
  { value: '24h', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, timeFilter }),
      });
      const data = await response.json();
      setResults(data.webPages?.value || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Web Search</h1>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="flex-1 p-2 border rounded"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            <div className="flex justify-center">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="p-2 border rounded bg-white"
              >
                {timeFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.id} className="border p-4 rounded">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  <h2 
                    className="text-xl font-semibold"
                    dangerouslySetInnerHTML={{ __html: result.name }}
                  />
                </a>
                <p className="text-green-700 text-sm">{result.url}</p>
                <p 
                  className="mt-1"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
