import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { isAuthenticated } from './AuthEmployee';
import AppLayout from '@/components/layout/AppLayout';

export default function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/Access" replace state={{ from: location }} />;
  }
  return <AppLayout />;
}