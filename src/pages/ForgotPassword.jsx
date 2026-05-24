import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccess(res.message || 'If an account with that email exists, a password reset link has been sent.');
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-h1 text-[28px] text-primary">Medway</h1>
          <p className="font-body-lg text-on-surface-variant">CMS Health Platform</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
          {!sent ? (
            <>
              <h2 className="font-h2 text-on-surface text-center mb-2">Forgot Password</h2>
              <p className="font-body-md text-on-surface-variant text-center mb-6">
                Enter your registered email address and we'll send you a password reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-error-container border border-error/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="font-body-md text-error">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-h2 text-on-surface mb-2">Email Sent</h2>
              <p className="font-body-md text-on-surface-variant mb-6">
                {success}
              </p>
              <p className="font-caption text-on-surface-variant mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setSuccess(''); }}
                  className="text-secondary hover:underline font-bold"
                >
                  try again
                </button>
                .
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-outline-variant">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-secondary hover:underline font-body-md font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>

        <p className="font-caption text-on-surface-variant text-center mt-6">
          © {new Date().getFullYear()} JIREH Technologies • Clinical Performance Portal
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
