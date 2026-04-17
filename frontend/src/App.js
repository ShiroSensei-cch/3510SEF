import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import Navbar from './components/Navbar.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import RoleBasedRedirect from './components/RoleBasedRedirect.js';  // <-- import the new component
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Restaurant from './pages/Restaurant.js';
import Tracking from './pages/Tracking.js';
import DeliveryDashboard from './pages/DeliveryDashboard.js';
import RestaurantDashboard from './pages/RestaurantDashboard.js';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Home route – role‑based redirect (customer sees restaurant list) */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Protected routes – require login */}
              <Route
                path="/restaurant/:id"
                element={
                  <ProtectedRoute>
                    <Restaurant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking/:orderId"
                element={
                  <ProtectedRoute>
                    <Tracking />
                  </ProtectedRoute>
                }
              />

              {/* Delivery dashboard – only for delivery personnel */}
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRoles={['delivery_person']}>
                    <DeliveryDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Restaurant dashboard – only for restaurant owners */}
              <Route
                path="/restaurant-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['restaurant_owner']}>
                    <RestaurantDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;