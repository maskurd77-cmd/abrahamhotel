/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import GuestOrder from './pages/GuestOrder';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/AdminLayout';
import POSDashboard from './pages/admin/POSDashboard';
import RoomsManager from './pages/admin/RoomsManager';
import KitchenDisplay from './pages/admin/KitchenDisplay';
import ProductsManager from './pages/admin/ProductsManager';
import StaffManager from './pages/admin/StaffManager';
import Settings from './pages/admin/Settings';
import Reports from './pages/admin/Reports';
import TablesManager from './pages/admin/TablesManager';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        {/* Guest Routes */}
        <Route path="/" element={<Navigate to="/order" replace />} />
        <Route path="/order" element={<GuestOrder />} />

        {/* Security Requirement: Disallow common admin paths */}
        <Route path="/admin" element={<NotFound />} />
        <Route path="/login" element={<NotFound />} />
        <Route path="/administrator" element={<NotFound />} />
        <Route path="/wp-admin" element={<NotFound />} />

        {/* Secret Admin Route */}
        <Route path="/pos-shinglbana-manager-2026" element={<AdminLogin />} />

        {/* Protected Admin Nested Routes */}
        <Route 
          path="/pos-shinglbana-manager-2026/*" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="pos" element={<POSDashboard />} />
          <Route path="tables" element={<TablesManager />} />
          <Route path="rooms" element={<RoomsManager />} />
          <Route path="kds" element={<KitchenDisplay />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="reports" element={<Reports />} />
          <Route path="staff" element={<StaffManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

