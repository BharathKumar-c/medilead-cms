import {useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {Stethoscope, Mail, Lock, Eye, EyeOff} from 'lucide-react';

const Login = () => {
  const {login} = useAuth();
  const [email, setEmail] = useState('bharath@medcloud.health');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
          <h1 className="font-h1 text-[28px] text-primary">MedCloud</h1>
          <p className="font-body-lg text-on-surface-variant">
            Health Platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
          <h2 className="font-h2 text-on-surface text-center mb-2">
            Welcome Back
          </h2>
          <p className="font-body-md text-on-surface-variant text-center mb-6">
            Sign in to your clinical dashboard
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error-container border border-error/20 rounded-lg">
              <p className="font-body-md text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1">
                Email
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

            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  {showPassword ? (
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
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant">
            <p className="font-caption text-on-surface-variant text-center">
              Demo credentials are pre-filled. Click Sign In to continue.
            </p>
          </div>
        </div>

        <p className="font-caption text-on-surface-variant text-center mt-6">
          © 2024 MedCloud Systems • Clinical Performance Portal
        </p>
      </div>
    </div>
  );
};

export default Login;
