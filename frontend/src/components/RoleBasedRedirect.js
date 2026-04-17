import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';  // fixed path and added .js
import Home from '../pages/Home.js';  // fixed path and added .js

const RoleBasedRedirect = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role === 'delivery_person') return <Navigate to="/delivery" replace />;
  if (currentUser.role === 'restaurant_owner') return <Navigate to="/restaurant-dashboard" replace />;
  return <Home />;
};

export default RoleBasedRedirect;