import { useState, useEffect } from 'react';
import { Lock, Shield, Mail, Save, Eye, EyeOff } from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const AccountSettings = () => {
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [settings, setSettings] = useState({ two_factor_enabled: false, email_notifications: true });
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    api.getSettings().then(res => {
      if (res?.data?.settings) setSettings(res.data.settings);
    }).catch(() => {});
  }, []);

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.newPass) {
      addToast('error', 'Missing Fields', 'Current and new password are required.');
      return;
    }
    if (passwords.newPass.length < 6) {
      addToast('error', 'Weak Password', 'New password must be at least 6 characters.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      addToast('error', 'Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(passwords.current, passwords.newPass);
      setPasswords({ current: '', newPass: '', confirm: '' });
      addToast('success', 'Password Changed', 'Your password has been updated.');
    } catch (err) {
      addToast('error', 'Change Failed', err.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      await api.updateSettings({ [key]: newValue });
      addToast('success', 'Setting Updated', `${key === 'two_factor_enabled' ? 'Two-Factor Authentication' : 'Email Notifications'} ${newValue ? 'enabled' : 'disabled'}.`);
    } catch {
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      addToast('error', 'Update Failed', 'Could not save setting.');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Layout title="Account Settings">
      <div className="p-4 sm:p-6 lg:p-10 max-w-3xl">
        <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-6">Account Settings</h1>

        {/* Change Password */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <h2 className="font-h3 text-on-surface flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-secondary" /> Change Password
          </h2>

          <div className="space-y-4">
            {[
              { key: 'current', label: 'Current Password' },
              { key: 'newPass', label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">{f.label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[f.key] ? 'text' : 'password'}
                    value={passwords[f.key]}
                    onChange={(e) => setPasswords(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
                  />
                  <button type="button" onClick={() => togglePasswordVisibility(f.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors">
                    {showPasswords[f.key] ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button onClick={handlePasswordChange} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Security & Notifications */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 className="font-h3 text-on-surface flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-secondary" /> Security & Notifications
          </h2>

          <div className="space-y-4">
            {/* Two-Factor Auth */}
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
              <div>
                <p className="font-body-md font-bold text-on-surface">Two-Factor Authentication</p>
                <p className="font-body-sm text-on-surface-variant mt-0.5">Add an extra layer of security to your account</p>
              </div>
              <button onClick={() => handleToggle('two_factor_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.two_factor_enabled ? 'bg-secondary' : 'bg-outline-variant'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.two_factor_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
              <div>
                <p className="font-body-md font-bold text-on-surface flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary" /> Email Notifications
                </p>
                <p className="font-body-sm text-on-surface-variant mt-0.5">Receive email alerts for important updates</p>
              </div>
              <button onClick={() => handleToggle('email_notifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.email_notifications ? 'bg-secondary' : 'bg-outline-variant'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email_notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

export default AccountSettings;
