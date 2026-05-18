import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-10">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <p className="font-h1 text-[96px] text-secondary leading-none">404</p>
          <h1 className="font-h2 text-on-surface mt-4">Page Not Found</h1>
          <p className="font-body-lg text-on-surface-variant mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container-low transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-left">
          <h3 className="font-h3 text-on-surface mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/" className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors font-body-md text-on-surface">
              Dashboard
            </Link>
            <Link to="/lead-box" className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors font-body-md text-on-surface">
              Lead Box
            </Link>
            <Link to="/reports" className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors font-body-md text-on-surface">
              Reports
            </Link>
            <Link to="/appointments" className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors font-body-md text-on-surface">
              Appointments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
