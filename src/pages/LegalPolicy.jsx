import { Shield, Lock, Eye, Mail, Phone } from 'lucide-react';
import Layout from '../components/Layout';

const LegalPolicy = () => {
  return (
    <Layout title="Privacy Policy">
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-[900px] mx-auto space-y-6 lg:space-y-8">
          <div>
            <h2 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-1">Privacy Policy</h2>
            <p className="font-body-lg text-on-surface-variant">Last updated: October 20, 2024</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm space-y-8">
            <div className="flex items-start gap-4 p-4 bg-secondary-fixed rounded-xl">
              <Shield className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-h3 text-on-surface mb-2">Our Commitment to Privacy</h3>
                <p className="font-body-md text-on-surface-variant">
                  MedCloud Systems is committed to protecting the privacy and security of patient health information.
                  This policy describes how we collect, use, and safeguard your data in compliance with HIPAA and applicable healthcare regulations.
                </p>
              </div>
            </div>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">1. Information We Collect</h3>
              <p className="font-body-md text-on-surface-variant mb-3">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 font-body-md text-on-surface-variant ml-4">
                <li>Patient demographic information (name, date of birth, contact details)</li>
                <li>Medical record identifiers (UHC ID, insurance information)</li>
                <li>Clinical notes and remarks entered by healthcare providers</li>
                <li>Appointment scheduling data</li>
                <li>Communication logs and call records</li>
              </ul>
            </section>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">2. How We Use Your Information</h3>
              <p className="font-body-md text-on-surface-variant mb-3">
                The information we collect is used for:
              </p>
              <ul className="list-disc list-inside space-y-2 font-body-md text-on-surface-variant ml-4">
                <li>Providing and managing healthcare services</li>
                <li>Scheduling and managing patient appointments</li>
                <li>Tracking patient leads and referrals</li>
                <li>Generating clinical performance reports</li>
                <li>Communicating with patients regarding their care</li>
              </ul>
            </section>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">3. Data Security</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div className="p-4 bg-surface-container-low rounded-xl text-center">
                  <Lock className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="font-body-md font-bold text-on-surface">Encrypted Storage</p>
                  <p className="font-caption text-on-surface-variant">AES-256 encryption at rest</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl text-center">
                  <Shield className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="font-body-md font-bold text-on-surface">HIPAA Compliant</p>
                  <p className="font-caption text-on-surface-variant">Full regulatory compliance</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl text-center">
                  <Eye className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="font-body-md font-bold text-on-surface">Access Controls</p>
                  <p className="font-caption text-on-surface-variant">Role-based permissions</p>
                </div>
              </div>
              <p className="font-body-md text-on-surface-variant">
                We implement industry-standard security measures to protect your data, including encrypted transmission (TLS 1.3),
                secure data centers with SOC 2 Type II certification, and regular security audits.
              </p>
            </section>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">4. Data Retention</h3>
              <p className="font-body-md text-on-surface-variant">
                Patient records are retained in accordance with applicable healthcare regulations, typically a minimum of 7 years
                from the date of last service. Upon expiration of the retention period, data is securely archived or deleted
                in compliance with legal requirements.
              </p>
            </section>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">5. Your Rights</h3>
              <p className="font-body-md text-on-surface-variant mb-3">
                Under applicable data protection laws, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 font-body-md text-on-surface-variant ml-4">
                <li>Access your personal health information</li>
                <li>Request corrections to inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Receive a copy of your data in a portable format</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h3 className="font-h3 text-on-surface mb-3">6. Contact Us</h3>
              <p className="font-body-md text-on-surface-variant mb-4">
                If you have questions about this privacy policy or wish to exercise your data rights, contact our Privacy Officer:
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
                  <Mail className="w-5 h-5 text-secondary" />
                  <span className="font-body-md text-on-surface">privacy@medcloud.health</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
                  <Phone className="w-5 h-5 text-secondary" />
                  <span className="font-body-md text-on-surface">+1 (800) 555-1234</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LegalPolicy;
