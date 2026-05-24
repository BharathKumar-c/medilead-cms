import {useState, useEffect} from 'react';
import {
  ShieldCheck,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const toast = (type, title, message) => {
  window.dispatchEvent(
    new CustomEvent('app-toast', {detail: {type, title, message}}),
  );
};

const LicenseManagement = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [licenseInfo, setLicenseInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    if (!accessKey.trim()) {
      toast('error', 'Missing Key', 'Please enter the access key.');
      return;
    }

    setVerifying(true);
    try {
      await api.verifyLicenseKey(accessKey);
      setUnlocked(true);
      loadLicenseStatus();
    } catch (err) {
      toast('error', 'Access Denied', err.message || 'Invalid access key.');
    } finally {
      setVerifying(false);
    }
  };

  const loadLicenseStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getLicenseStatus();
      if (res?.data) setLicenseInfo(res.data);
    } catch (err) {
      toast('error', 'Error', err.message || 'Failed to load license status.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpiry = async (e) => {
    e.preventDefault();
    if (!expiryDate) {
      toast('error', 'Missing Date', 'Please select a new expiry date.');
      return;
    }

    const selected = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected <= today) {
      toast('error', 'Invalid Date', 'Expiry date must be in the future.');
      return;
    }

    setUpdating(true);
    try {
      await api.updateLicenseExpiry(expiryDate);
      toast('success', 'License Updated', `Expiry date set to ${expiryDate}.`);
      setExpiryDate('');
      await loadLicenseStatus();
    } catch (err) {
      toast(
        'error',
        'Update Failed',
        err.message || 'Failed to update license.',
      );
    } finally {
      setUpdating(false);
    }
  };

  const statusColor = licenseInfo?.valid
    ? 'bg-tertiary-container border-tertiary'
    : 'bg-error-container border-error';

  const statusIcon = licenseInfo?.valid ? (
    <CheckCircle className="w-6 h-6 text-tertiary" />
  ) : (
    <AlertTriangle className="w-6 h-6 text-error" />
  );

  const statusText = licenseInfo?.valid ? 'Active' : 'Expired';

  // Lock screen — access key required
  if (!unlocked) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Lock className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h1 className="font-h1 text-on-surface">License Management</h1>
              <p className="font-body-md text-on-surface-variant mt-1">
                Enter the access key to view and manage the license.
              </p>
            </div>

            <form
              onSubmit={handleVerifyKey}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8 space-y-4">
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1">
                  Access Key
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Enter access key"
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
                disabled={verifying || !accessKey.trim()}
                className="w-full py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {verifying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  'Unlock'
                )}
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  // Unlocked — show license management
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-h1 text-on-surface">License Management</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            View and manage your license status and expiry date.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : licenseInfo ? (
          <>
            {/* Status Card */}
            <div className={`rounded-xl border p-6 ${statusColor}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-lowest shadow-sm">
                  {statusIcon}
                </div>
                <div>
                  <h2 className="font-h2 text-orange-100">
                    License {statusText}
                  </h2>
                  <p className="font-body-md text-outline-variant">
                    {licenseInfo.daysRemaining > 0
                      ? `${licenseInfo.daysRemaining} day${licenseInfo.daysRemaining !== 1 ? 's' : ''} remaining`
                      : 'No days remaining'}
                    {licenseInfo.graceDays > 0 &&
                      ` (${licenseInfo.graceDays}-day grace period)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-5 h-5 text-secondary" />
                  <span className="font-caption text-on-surface-variant uppercase">
                    Expiry Date
                  </span>
                </div>
                <p className="font-h3 text-on-surface">
                  {licenseInfo.expiryDate
                    ? new Date(
                        licenseInfo.expiryDate + 'T00:00:00',
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  <span className="font-caption text-on-surface-variant uppercase">
                    Days Left
                  </span>
                </div>
                <p className="font-h3 text-on-surface">
                  {licenseInfo.daysRemaining}
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-secondary" />
                  <span className="font-caption text-on-surface-variant uppercase">
                    Grace Period
                  </span>
                </div>
                <p className="font-h3 text-on-surface">
                  {licenseInfo.graceDays} days
                </p>
              </div>
            </div>

            {/* Update Expiry Form */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <h3 className="font-h3 text-on-surface mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-secondary" />
                Update Expiry Date
              </h3>
              <form
                onSubmit={handleUpdateExpiry}
                className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updating || !expiryDate}
                  className="px-6 py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                  {updating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    'Update Expiry'
                  )}
                </button>
              </form>
              <p className="font-caption text-on-surface-variant mt-3">
                Set a new expiry date to extend the license. Changes persist
                across server restarts.
              </p>
            </div>
          </>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
            <p className="font-body-md text-on-surface-variant">
              Unable to load license status.
            </p>
            <button
              onClick={loadLicenseStatus}
              className="mt-4 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
              Retry
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LicenseManagement;
