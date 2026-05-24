import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const LicenseContext = createContext(null);

export const LicenseProvider = ({ children }) => {
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    api.onServiceUnavailable(() => {
      setLicenseExpired(true);
    });
  }, []);

  const unlock = useCallback(async (unlockKey) => {
    const result = await api.unlockLicense(unlockKey);
    setLicenseExpired(false);
    return result;
  }, []);

  const value = useMemo(() => ({
    licenseExpired,
    unlock,
  }), [licenseExpired, unlock]);

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

export default LicenseContext;
