import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { CinematicProvider, useCinematic } from '@/contexts/CinematicContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { CinematicBackground } from '@/components/cinematic/CinematicBackground';

import { routes } from './routes';

// Defined inside the tree so Fast Refresh always re-renders it within all providers
function AppContent() {
  const { activeTheme, customization, isCinematic } = useCinematic();
  return (
    <>
      {isCinematic && activeTheme && customization && (
        <CinematicBackground theme={activeTheme} customization={customization} />
      )}
      <RouteGuard>
        <AppLayout>
          <Routes>
            {routes.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </RouteGuard>
    </>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CinematicProvider>
        <Router>
          <IntersectObserver />
          <AppContent />
          <Toaster />
        </Router>
      </CinematicProvider>
    </AuthProvider>
  );
};

export default App;


