import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';  // 添加 useNavigate
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.js';

const Restaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/restaurants/${id}`);
        setRestaurant(res.data.restaurant);
        setMenu(res.data.menu);
      } catch (err) {
        console.error('Error fetching restaurant:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id]);

  const addToCart = (menuItem) => {
    const existingItem = cart.find(item => item.menuItem._id === menuItem._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.menuItem._id === menuItem._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { menuItem, quantity: 1, price: menuItem.price }]);
    }
  };

  const removeFromCart = (menuItemId) => {
    setCart(cart.filter(item => item.menuItem._id !== menuItemId));
  };

  const updateQuantity = (menuItemId, quantity) => {
    if (quantity === 0) {
      removeFromCart(menuItemId);
    } else {
      setCart(cart.map(item =>
        item.menuItem._id === menuItemId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const placeOrder = async () => {
    if (!currentUser) {
      alert('Please login to place an order');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {
      const orderData = {
        restaurant: id,
        items: cart.map(item => ({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: getTotalAmount(),
        deliveryAddress: currentUser.address || '123 Main St, City, State'
      };

      const res = await axios.post('http://localhost:5000/api/orders', orderData);
      alert('Order placed successfully!');
      setCart([]);
      // Redirect to tracking page
      navigate(`/tracking/${res.data._id}`);
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <div className="loading">Loading restaurant...</div>;
  }

  if (!restaurant) {
    return <div className="error">Restaurant not found</div>;
  }

  return (
    <div className="restaurant-page">
      <div className="container">
        <div className="restaurant-header">
          <img src={restaurant.image} alt={restaurant.name} className="restaurant-image-large" />
          <div className="restaurant-info">
            <h1>{restaurant.name}</h1>
            <p className="cuisine">{restaurant.cuisine}</p>
            <p className="description">{restaurant.description}</p>
            <p className="delivery-time">🕐 {restaurant.deliveryTime}</p>
            <p className="rating">⭐ {restaurant.rating}/5</p>
            <p className="address">📍 {restaurant.address}</p>
          </div>
        </div>

        <div className="menu-section">
          <h2>Menu</h2>
          <div className="menu-items">
            {menu.map(item => (
              <div key={item._id} className="menu-item-card">
                <img src={item.image} alt={item.name} className="menu-item-image" />
                <div className="menu-item-info">
                  <h3>{item.name}</h3>
                  <p className="menu-item-description">{item.description}</p>
                  <p className="menu-item-price">${item.price}</p>
                  <button 
                    onClick={() => addToCart(item)}
                    className="add-to-cart-btn"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="cart-section">
            <h2>Your Order</h2>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.menuItem._id} className="cart-item">
                  <span className="item-name">{item.menuItem.name}</span>
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item.menuItem._id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem._id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <span className="item-total">${(item.price * item.quantity).toFixed(2)}</span>
                  <button 
                    onClick={() => removeFromCart(item.menuItem._id)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <h3>Total: ${getTotalAmount().toFixed(2)}</h3>
              <button onClick={placeOrder} className="place-order-btn">
                Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurant;