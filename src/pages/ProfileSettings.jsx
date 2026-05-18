import { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Phone, Image, Calendar, Save } from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

let toastId = 0;

const ProfileSettings = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', role: '', specialty: '', phone: '', avatar_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        specialty: user.specialty || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateProfile({
        name: form.name,
        specialty: form.specialty,
        phone: form.phone,
        avatar_url: form.avatar_url,
      });
      const updatedUser = { ...user, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);
      addToast('success', 'Profile Updated', 'Your profile has been saved successfully.');
    } catch (err) {
      addToast('error', 'Update Failed', err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Profile Settings">
      <div className="p-4 sm:p-6 lg:p-10 max-w-3xl">
        <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-6">Profile Settings</h1>

        {/* Avatar Preview */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-secondary bg-secondary flex items-center justify-center flex-shrink-0">
              {form.avatar_url ? (
                <img alt="Avatar" className="w-full h-full object-cover" src={form.avatar_url} />
              ) : (
                <span className="text-white font-bold text-2xl">{form.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              )}
            </div>
            <div>
              <p className="font-h2 text-on-surface">{form.name}</p>
              <p className="font-body-md text-on-surface-variant capitalize">{form.role}</p>
              {user?.created_at && (
                <p className="font-caption text-on-surface-variant mt-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Member since {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <User className="w-3.5 h-3.5 inline mr-1" />Full Name
              </label>
              <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1" />Email
              </label>
              <input type="email" value={form.email} readOnly
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface-variant bg-surface-container cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <Briefcase className="w-3.5 h-3.5 inline mr-1" />Role
              </label>
              <input type="text" value={form.role} readOnly
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface-variant bg-surface-container cursor-not-allowed capitalize" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <Briefcase className="w-3.5 h-3.5 inline mr-1" />Specialty
              </label>
              <input type="text" value={form.specialty} onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                placeholder="e.g. Cardiology"
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <Phone className="w-3.5 h-3.5 inline mr-1" />Phone
              </label>
              <input type="tel" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="9876543210" maxLength={10}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                <Image className="w-3.5 h-3.5 inline mr-1" />Avatar URL
              </label>
              <input type="text" value={form.avatar_url} onChange={(e) => setForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

export default ProfileSettings;
