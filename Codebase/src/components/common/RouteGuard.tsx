import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginBackground } from '@/components/auth/LoginBackground';

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <LoginBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loadingâ€¦</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

  // Not authenticated â†’ redirect to login, preserve intended destination
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Already authenticated â†’ skip auth pages, send to intended or home
  if (user && isPublicRoute) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}


