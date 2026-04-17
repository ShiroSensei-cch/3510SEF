import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🍕 FoodApp
        </Link>
        <div className="nav-links">
          {currentUser ? (
            <>
              <span className="welcome-text">Welcome, {currentUser.name}</span>
              
              
              {currentUser.role === 'delivery_person' && (
                <Link to="/delivery" className="nav-link">
                  🚚 Delivery Dashboard
                </Link>
              )}
              
              
              {currentUser.role === 'restaurant_owner' && (
                <Link to="/restaurant-dashboard" className="nav-link">
                  🍽️ My Restaurant
                </Link>
              )}

              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;