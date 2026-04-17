import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useAuth();

  // Not logged in → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // User does not have permission – redirect to home (or a "forbidden" page)
    return <Navigate to="/" replace />;
  }

  // Authorized → render the children (the page component)
  return children;
};

export default ProtectedRoute;