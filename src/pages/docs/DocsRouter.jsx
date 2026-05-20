import { Routes, Route, Navigate } from 'react-router-dom';
import DocsLayout from './DocsLayout';
import DocsSearch from './DocsSearch';
import GettingStarted from './sections/GettingStarted';
import SuperAdminGuide from './sections/SuperAdminGuide';
import ManagerGuide from './sections/ManagerGuide';
import TelecallerGuide from './sections/TelecallerGuide';
import LeadManagement from './sections/LeadManagement';
import Appointments from './sections/Appointments';
import SIPIntegration from './sections/SIPIntegration';
import Reports from './sections/Reports';
import Notifications from './sections/Notifications';
import APIReference from './sections/APIReference';
import DatabaseSchema from './sections/DatabaseSchema';
import Security from './sections/Security';

const DocsRouter = () => {
  return (
    <DocsLayout>
      <Routes>
        <Route path="search" element={<DocsSearch />} />
        <Route path="installation" element={<GettingStarted />} />
        <Route path="environment" element={<GettingStarted />} />
        <Route path="first-login" element={<GettingStarted />} />
        <Route path="super-admin" element={<SuperAdminGuide />} />
        <Route path="manager" element={<ManagerGuide />} />
        <Route path="telecaller" element={<TelecallerGuide />} />
        <Route path="lead-management" element={<LeadManagement />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="sip-integration" element={<SIPIntegration />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="api-auth" element={<APIReference />} />
        <Route path="api-leads" element={<APIReference />} />
        <Route path="api-appointments" element={<APIReference />} />
        <Route path="api-calls" element={<APIReference />} />
        <Route path="api-dashboard" element={<APIReference />} />
        <Route path="api-reports" element={<APIReference />} />
        <Route path="api-notifications" element={<APIReference />} />
        <Route path="database-schema" element={<DatabaseSchema />} />
        <Route path="security" element={<Security />} />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </DocsLayout>
  );
};

export default DocsRouter;
