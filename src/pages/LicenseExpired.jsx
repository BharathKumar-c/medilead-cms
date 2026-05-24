import { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

const LicenseExpired = () => {
  const { unlock } = useLicense();
  const [unlockKey, setUnlockKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await unlock(unlockKey);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Invalid unlock key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-tertiary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-h2 text-on-surface mb-2">License Unlocked</h2>
          <p className="font-body-md text-on-surface-variant mb-6">
            Your license has been successfully unlocked. You will be redirected
            shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-error rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-h1 text-[28px] text-primary">Medway</h1>
          <p className="font-body-lg text-on-surface-variant">
            CMS Health Platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
          <h2 className="font-h2 text-on-surface text-center mb-2">
            License Expired
          </h2>
          <p className="font-body-md text-on-surface-variant text-center mb-6">
            Enter your unlock key to restore service
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error-container border border-error rounded-lg">
              <p className="font-body-sm text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1">
                Unlock Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={unlockKey}
                  onChange={(e) => setUnlockKey(e.target.value)}
                  placeholder="Enter your unlock key"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  {showKey ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </div>
              ) : (
                'Unlock'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant">
            <p className="font-caption text-on-surface-variant text-center">
              Contact your administrator for the unlock key or{' '}
              <a
                href="mailto:support@medway.health"
                className="text-secondary hover:underline">
                JIREH Technologies
              </a>{' '}
              for license renewal.
            </p>
          </div>
        </div>

        <p className="font-caption text-on-surface-variant text-center mt-6">
          © {new Date().getFullYear()} JIREH Technologies • Clinical Performance
          Portal
        </p>
      </div>
    </div>
  );
};

export default LicenseExpired;
