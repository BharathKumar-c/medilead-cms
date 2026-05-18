import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Menu, X, ChevronRight, ChevronDown, ArrowUp,
  Rocket, Users, LayoutDashboard, Code, Settings, BookOpen, Home,
} from 'lucide-react';
import { docsNavigation, searchableContent } from '../../data/docs';

const iconMap = {
  Rocket, Users, LayoutDashboard, Code, Settings,
};

const DocsLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const contentRef = useRef(null);

  // Auto-expand active section
  useEffect(() => {
    const currentSlug = location.pathname.split('/docs/')[1] || '';
    for (const section of docsNavigation) {
      if (section.children?.some(c => c.id === currentSlug)) {
        setExpanded(prev => ({ ...prev, [section.id]: true }));
        break;
      }
    }
  }, [location.pathname]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Scroll to top button
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollTop(el.scrollTop > 400);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = searchableContent.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
  }, [searchQuery]);

  // Close search on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentSlug = location.pathname.split('/docs/')[1] || '';

  const breadcrumbs = [{ label: 'Docs', to: '/docs' }];
  for (const section of docsNavigation) {
    const child = section.children?.find(c => c.id === currentSlug);
    if (child) {
      breadcrumbs.push({ label: section.title, to: null });
      breadcrumbs.push({ label: child.title, to: null });
      break;
    }
  }

  const handleSearchSelect = (item) => {
    setShowSearch(false);
    setSearchQuery('');
    navigate(`/docs/${item.id}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/docs/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-100">
            <Link to="/docs" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">MediLead CMS</h1>
                <p className="text-xs text-gray-500">Documentation</p>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 lg:hidden">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Sidebar search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSearchSelect(item)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.section}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {docsNavigation.map(section => {
              const Icon = iconMap[section.icon] || BookOpen;
              const isExpanded = expanded[section.id];
              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-left">{section.title}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isExpanded && section.children && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                      {section.children.map(child => (
                        <Link
                          key={child.id}
                          to={`/docs/${child.id}`}
                          className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${currentSlug === child.id ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-gray-100">
            <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <Home className="w-4 h-4" />
              Back to App
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 lg:hidden">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-gray-500">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-gray-900">{crumb.label}</Link>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {/* Top search */}
            <div className="ml-auto relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)}
                    className="w-48 sm:w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSearchSelect(item)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.section}</p>
                    </button>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    See all results for "{searchQuery}"
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        {/* Scroll to top */}
        {showScrollTop && (
          <button
            onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DocsLayout;
