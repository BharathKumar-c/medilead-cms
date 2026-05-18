import {Sun, Moon, Monitor, Check} from 'lucide-react';
import Layout from '../components/Layout';
import {useTheme} from '../context/ThemeContext';

const themes = [
  {
    key: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Clean and bright interface',
  },
  {
    key: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Easy on the eyes in low light',
  },
  {
    key: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Matches your device settings',
  },
];

const Appearance = () => {
  const {theme, setTheme} = useTheme();

  return (
    <Layout title="Appearance">
      <div className="p-4 sm:p-6 lg:p-10 max-w-3xl">
        <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-2">
          Appearance
        </h1>
        <p className="font-body-md text-on-surface-variant mb-8">
          Customize how MediLead CMS looks on your device.
        </p>

        <div className="space-y-4">
          {themes.map(({key, label, icon: Icon, description}) => {
            const isActive = theme === key;
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`w-full flex items-center gap-5 p-5 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? 'border-secondary bg-secondary/5 shadow-sm'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-outline hover:bg-surface-container'
                }`}>
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                    isActive ? 'bg-secondary/10' : 'bg-surface-container-high'
                  }`}>
                  <Icon
                    className={`w-6 h-6 ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-body-lg font-bold ${isActive ? 'text-secondary' : 'text-on-surface'}`}>
                      {label}
                    </p>
                    {isActive && <Check className="w-5 h-5 text-secondary" />}
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview Card */}
        <div className="mt-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h3 className="font-h3 text-on-surface mb-4">Preview</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">SJ</span>
              </div>
              <div>
                <p className="font-body-md font-bold text-on-surface">
                  Dr. Bharath
                </p>
                <p className="font-body-sm text-on-surface-variant">
                  Cardiologist
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full font-caption text-xs">
                New Lead
              </span>
              <span className="px-3 py-1 bg-on-tertiary-container/10 text-on-tertiary-container rounded-full font-caption text-xs">
                Follow-up
              </span>
              <span className="px-3 py-1 bg-error/10 text-error rounded-full font-caption text-xs">
                Urgent
              </span>
            </div>
            <button className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-body-md font-bold text-sm">
              Sample Button
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Appearance;
