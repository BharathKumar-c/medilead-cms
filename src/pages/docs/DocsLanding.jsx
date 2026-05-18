import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Users, LayoutDashboard, Phone, BarChart3,
  Bell, Shield, Code, BookOpen, Stethoscope, Calendar, Rocket,
  ChevronRight, Zap, Database, Lock,
} from 'lucide-react';

const features = [
  { icon: LayoutDashboard, title: 'Lead Management', desc: 'Create, track, and manage patient leads with status workflows, auto-assignment, and duplicate detection.', to: '/docs/lead-management', color: 'blue' },
  { icon: Calendar, title: 'Appointments', desc: 'Book, reschedule, and cancel appointments with calendar view, department filtering, and automated reminders.', to: '/docs/appointments', color: 'green' },
  { icon: Phone, title: 'SIP Calling', desc: 'Integrated VoIP calling with incoming call popups, auto lead lookup, call logging, and real-time events.', to: '/docs/sip-integration', color: 'purple' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Comprehensive dashboards with call volume, conversion funnels, telecaller performance, and CSV export.', to: '/docs/reports', color: 'orange' },
  { icon: Bell, title: 'Notifications', desc: 'Real-time Socket.IO notifications for follow-ups, missed calls, lead assignments, and status changes.', to: '/docs/notifications', color: 'red' },
  { icon: Users, title: 'User Management', desc: 'Role-based access control with Super Admin, Manager, and Telecaller roles. Full user CRUD.', to: '/docs/super-admin', color: 'indigo' },
];

const roles = [
  { title: 'Super Admin', desc: 'Full system access — manage users, configure settings, view all data, access all reports.', to: '/docs/super-admin', icon: Shield, color: 'purple' },
  { title: 'Manager', desc: 'Team oversight — view all leads and appointments, monitor performance, assign leads.', to: '/docs/manager', icon: Users, color: 'blue' },
  { title: 'Telecaller', desc: 'Daily operations — manage assigned leads, make calls, book appointments, log activities.', to: '/docs/telecaller', icon: Phone, color: 'green' },
];

const quickLinks = [
  { icon: Rocket, label: 'Getting Started', to: '/docs/installation' },
  { icon: Code, label: 'API Reference', to: '/docs/api-auth' },
  { icon: Database, label: 'Database Schema', to: '/docs/database-schema' },
  { icon: Lock, label: 'Security', to: '/docs/security' },
  { icon: Stethoscope, label: 'SIP Setup', to: '/docs/sip-integration' },
  { icon: Zap, label: 'Notifications', to: '/docs/notifications' },
  { icon: Phone, label: 'SIP Test Panel', to: '/sip-test' },
];

const colorClasses = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'bg-blue-100' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: 'bg-green-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'bg-purple-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'bg-orange-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: 'bg-red-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: 'bg-indigo-100' },
};

const DocsLanding = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/docs/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/docs" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">MediLead CMS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm text-blue-100 mb-6">
            <Stethoscope className="w-4 h-4" />
            Healthcare CRM Documentation
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
            MediLead CMS
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Complete guide to managing patients, appointments, calls, and reports for your healthcare practice.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation... (e.g., 'how to book appointment')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-base bg-white rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Search
            </button>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Leads', 'Appointments', 'SIP Calls', 'Reports', 'API'].map(term => (
              <button
                key={term}
                onClick={() => navigate(`/docs/search?q=${term.toLowerCase()}`)}
                className="px-3 py-1 bg-white/10 text-white rounded-full text-sm hover:bg-white/20 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Features */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Features</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Everything you need to manage your healthcare practice efficiently.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => {
              const c = colorClasses[f.color];
              return (
                <Link key={f.title} to={f.to} className={`group p-6 bg-white border ${c.border} rounded-xl hover:shadow-lg transition-all`}>
                  <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center mb-4`}>
                    <f.icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{f.desc}</p>
                  <span className={`text-sm ${c.text} font-medium flex items-center gap-1`}>
                    Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Role Guides */}
        <section className="py-16 border-t border-gray-200">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">User Role Guides</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Learn how each role uses the application in their daily workflow.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {roles.map(r => {
              const c = colorClasses[r.color];
              return (
                <Link key={r.title} to={r.to} className={`group p-6 bg-white border ${c.border} rounded-xl hover:shadow-lg transition-all text-center`}>
                  <div className={`w-16 h-16 ${c.icon} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <r.icon className={`w-8 h-8 ${c.text}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{r.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{r.desc}</p>
                  <span className={`text-sm ${c.text} font-medium flex items-center justify-center gap-1`}>
                    Read Guide <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-16 border-t border-gray-200">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Quick Links</h2>
            <p className="text-gray-600">Jump to popular documentation sections.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map(link => (
              <Link key={link.label} to={link.to} className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                <link.icon className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-700 text-center">{link.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '55+', label: 'API Endpoints' },
              { value: '13', label: 'Database Tables' },
              { value: '3', label: 'User Roles' },
              { value: '14', label: 'UI Pages' },
            ].map(stat => (
              <div key={stat.label} className="p-6 bg-white border border-gray-200 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-gray-500">MediLead CMS Documentation &mdash; Healthcare CRM System</p>
        </div>
      </footer>
    </div>
  );
};

export default DocsLanding;
