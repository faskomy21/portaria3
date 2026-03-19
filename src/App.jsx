import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Dashboard from '@/pages/Dashboard';
import Blocks from '@/pages/Blocks';
import Apartments from '@/pages/Apartments';
import Residents from '@/pages/Residents';
import Deliveries from '@/pages/Deliveries';
import NewDelivery from '@/pages/NewDelivery';
import Access from '@/pages/Access';
import AdminUsers from '@/pages/AdminUsers';
import Reports from '@/pages/Reports';
import Keywords from '@/pages/Keywords';
import RefusedDeliveries from '@/pages/RefusedDeliveries';
import NewRefusedDelivery from '@/pages/NewRefusedDelivery';
import Approvals from '@/pages/Approvals';
import Register from '@/pages/Register';
import KeywordForm from '@/pages/KeywordForm';
import Tutorial from '@/pages/Tutorial';
import Audit from '@/pages/Audit';
import WhatsApp from '@/pages/WhatsApp';
import Tenants from '@/pages/Tenants';
import QRCode from '@/pages/QRCode';
import Portaria from '@/pages/Portaria';
import Home from '@/pages/Home';
import ClientSignup from '@/pages/ClientSignup';
import RequireAuth from '@/components/auth/RequireAuth';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/CadastroCliente" element={<ClientSignup />} />
      <Route path="/Access" element={<Access />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/KeywordForm" element={<KeywordForm />} />
      <Route path="/QRCode" element={<QRCode />} />
      <Route path="/Portaria" element={<Portaria />} />
      <Route element={<RequireAuth />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Blocks" element={<Blocks />} />
        <Route path="/Apartments" element={<Apartments />} />
        <Route path="/Residents" element={<Residents />} />
        <Route path="/Deliveries" element={<Deliveries />} />
        <Route path="/NewDelivery" element={<NewDelivery />} />
        <Route path="/AdminUsers" element={<AdminUsers />} />
        <Route path="/Tenants" element={<Tenants />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Keywords" element={<Keywords />} />
        <Route path="/RefusedDeliveries" element={<RefusedDeliveries />} />
        <Route path="/NewRefusedDelivery" element={<NewRefusedDelivery />} />
        <Route path="/Approvals" element={<Approvals />} />
        <Route path="/Tutorial" element={<Tutorial />} />
        <Route path="/Audit" element={<Audit />} />
        <Route path="/WhatsApp" element={<WhatsApp />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
