import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccessControl } from '@/contexts/AccessControlContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAccessControl();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;