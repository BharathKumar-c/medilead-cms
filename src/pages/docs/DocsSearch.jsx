import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { searchableContent } from '../../data/docs';

const DocsSearch = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matched = searchableContent.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q)
    );
    setResults(matched);
  }, [query]);

  const escapeHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const highlight = (text) => {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const pattern = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${pattern})`, 'gi');
    return escaped.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Search Results
        </h1>
        {query && (
          <p className="text-gray-600">
            {results.length} result{results.length !== 1 ? 's' : ''} for "<span className="font-medium text-gray-900">{query}</span>"
          </p>
        )}
      </div>

      {results.length === 0 && query && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-6">Try different keywords or browse the documentation sections.</p>
          <Link to="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Documentation Home
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map(item => (
            <Link
              key={item.id}
              to={`/docs/${item.id}`}
              className="block p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.section}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1"
                    dangerouslySetInnerHTML={{ __html: highlight(item.title) }} />
                  <p className="text-sm text-gray-600 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: highlight(item.content) }} />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search the documentation</h3>
          <p className="text-gray-600">Enter a search term to find relevant documentation pages.</p>
        </div>
      )}
    </div>
  );
};

export default DocsSearch;
