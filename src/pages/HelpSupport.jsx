import { useState } from 'react';
import {
  HelpCircle, Phone, Mail, MessageSquare, Book, Video,
  ChevronDown, ChevronRight, ExternalLink, Search, Clock,
} from 'lucide-react';
import Layout from '../components/Layout';

const faqs = [
  {
    question: 'How do I add a new patient lead?',
    answer: 'Click the "New" button in the top header bar. This opens the Patient Intake Form where you can enter patient details including UHC ID, contact information, and clinical remarks. If the phone number matches an existing record, the form will auto-fill known fields.',
  },
  {
    question: 'How do I reschedule an appointment?',
    answer: 'Navigate to the Appointments page, hover over the appointment you want to reschedule, click the three-dot menu, and select "Reschedule". Choose a new date and time slot, then confirm. You can also use the "Reschedule" button in the appointment header.',
  },
  {
    question: 'How do I export data from the system?',
    answer: 'Each page has an Export button. On the Dashboard, you can export the activity log as CSV. On Lead Box, you can export filtered leads. On Reports, you can export the summary report. All exports download as CSV files.',
  },
  {
    question: 'How do I filter leads in the Lead Box?',
    answer: 'Use the search bar to find leads by name, UHC ID, email, or phone. Click the "Filters" button to filter by status (New, Follow-up, or Closed). Filters and search work together — you can combine them.',
  },
  {
    question: 'How do I view detailed information about a lead?',
    answer: 'In the Lead Box table, click the eye icon (View) on any lead row. This opens a detailed modal showing all patient information including contact details, address, assigned provider, priority level, and clinical remarks.',
  },
  {
    question: 'What do the different lead statuses mean?',
    answer: 'New: A recently created lead that hasn\'t been contacted yet. Follow-up: A lead that requires additional contact or action. Closed: A lead that has been successfully processed or is no longer active.',
  },
];

const HelpSupport = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title="Help & Support">
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-[1440px] mx-auto space-y-6 lg:space-y-8">
          {/* Header */}
          <div>
            <h2 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-1">Help & Support</h2>
            <p className="font-body-md sm:font-body-lg text-on-surface-variant">Find answers, get in touch with our team, or browse documentation.</p>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-secondary p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary-fixed rounded-xl">
                  <Phone className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-h3 text-on-surface">Phone Support</h3>
                  <p className="font-caption text-on-surface-variant">Available 24/7</p>
                </div>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">Call our dedicated healthcare support line for immediate assistance.</p>
              <a href="tel:+18005551234" className="flex items-center gap-2 font-body-md font-bold text-secondary hover:underline">
                +1 (800) 555-1234
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-on-tertiary-container p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-tertiary-fixed rounded-xl">
                  <Mail className="w-6 h-6 text-on-tertiary-container" />
                </div>
                <div>
                  <h3 className="font-h3 text-on-surface">Email Support</h3>
                  <p className="font-caption text-on-surface-variant">Response within 4 hours</p>
                </div>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">Send us a detailed message and we'll get back to you promptly.</p>
              <a href="mailto:support@medcloud.health" className="flex items-center gap-2 font-body-md font-bold text-secondary hover:underline">
                support@medcloud.health
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-fixed rounded-xl">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-h3 text-on-surface">Live Chat</h3>
                  <p className="font-caption text-on-surface-variant">Mon-Fri, 8AM-6PM EST</p>
                </div>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">Chat with a support agent in real-time during business hours.</p>
              <button className="flex items-center gap-2 font-body-md font-bold text-secondary hover:underline">
                Start Chat
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Book className="w-6 h-6 text-secondary" />
                <h3 className="font-h3 text-on-surface">Documentation</h3>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">Browse our comprehensive user guide for step-by-step instructions on using MediCloud CMS.</p>
              <div className="space-y-2">
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <span className="font-body-md text-on-surface">Getting Started Guide</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <span className="font-body-md text-on-surface">Lead Management Workflow</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <span className="font-body-md text-on-surface">Appointment Scheduling</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <span className="font-body-md text-on-surface">Reports & Analytics</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Video className="w-6 h-6 text-secondary" />
                <h3 className="font-h3 text-on-surface">Video Tutorials</h3>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">Watch quick video walkthroughs of key features and workflows.</p>
              <div className="space-y-2">
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary/10 rounded flex items-center justify-center">
                      <Video className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <span className="font-body-md text-on-surface block">Dashboard Overview</span>
                      <span className="font-caption text-on-surface-variant">3 min</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary/10 rounded flex items-center justify-center">
                      <Video className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <span className="font-body-md text-on-surface block">Managing Patient Leads</span>
                      <span className="font-caption text-on-surface-variant">5 min</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
                <a href="#" className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary/10 rounded flex items-center justify-center">
                      <Video className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <span className="font-body-md text-on-surface block">Booking Appointments</span>
                      <span className="font-caption text-on-surface-variant">4 min</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                </a>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-h3 text-on-surface">Frequently Asked Questions</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div className="divide-y divide-outline-variant">
              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant font-body-md">No FAQs matching your search.</div>
              ) : (
                filteredFaqs.map((faq, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <span className="font-body-md font-bold text-on-surface pr-4">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 text-on-surface-variant flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-4">
                        <p className="font-body-md text-on-surface-variant">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-h3 text-on-surface mb-4">System Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="font-caption text-on-surface-variant uppercase">Version</p>
                <p className="font-body-md font-bold text-on-surface">2.4.1</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="font-caption text-on-surface-variant uppercase">Last Updated</p>
                <p className="font-body-md font-bold text-on-surface">Oct 20, 2024</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="font-caption text-on-surface-variant uppercase">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
                  <p className="font-body-md font-bold text-on-surface">Operational</p>
                </div>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="font-caption text-on-surface-variant uppercase">Uptime</p>
                <p className="font-body-md font-bold text-on-surface">99.98%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HelpSupport;
