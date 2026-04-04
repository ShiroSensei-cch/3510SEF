import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

const Tracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.io
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join the order room for real-time updates
    newSocket.emit('join_order', orderId);

    // Listen for order status updates
    newSocket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      setOrder(prevOrder => prevOrder ? { ...prevOrder, status: data.status } : prevOrder);
    });

    return () => {
      newSocket.close();
    };
  }, [orderId]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/orders/${orderId}`, {
          headers: {
            'x-auth-token': token
          }
        });
        setOrder(res.data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId]);

  const statusSteps = [
    { 
      status: 'placed', 
      label: 'Order Placed', 
      description: 'We have received your order',
      icon: '📝'
    },
    { 
      status: 'confirmed', 
      label: 'Order Confirmed', 
      description: 'Restaurant has confirmed your order',
      icon: '✅'
    },
    { 
      status: 'preparing', 
      label: 'Preparing Food', 
      description: 'Chef is cooking your delicious meal',
      icon: '👨‍🍳'
    },
    { 
      status: 'out_for_delivery', 
      label: 'Out for Delivery', 
      description: 'Your food is on the way!',
      icon: '🚗'
    },
    { 
      status: 'delivered', 
      label: 'Delivered', 
      description: 'Enjoy your meal!',
      icon: '🎉'
    }
  ];

  const currentStatusIndex = statusSteps.findIndex(step => step.status === order?.status);

  // Calculate estimated delivery time (mock calculation)
  const getEstimatedDeliveryTime = () => {
    if (!order) return '';
    const created = new Date(order.createdAt);
    const estimated = new Date(created.getTime() + 45 * 60000); // +45 minutes
    return estimated.toLocaleTimeString('en-HK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="container">
          <div className="loading">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-page">
        <div className="container">
          <div className="error">Order not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      <div className="container">
        <div className="tracking-header">
          <h1>Order Tracking</h1>
          <p className="order-number">Order # {order._id.slice(-8).toUpperCase()}</p>
        </div>

        <div className="order-summary">
          <div className="summary-card">
            <h3>Order Summary</h3>
            <div className="summary-details">
              <div className="detail-item">
                <span className="label">Restaurant:</span>
                <span className="value">{order.restaurant?.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Total Amount:</span>
                <span className="value">HK$ {order.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Delivery Address:</span>
                <span className="value">{order.deliveryAddress}</span>
              </div>
              <div className="detail-item">
                <span className="label">Estimated Delivery:</span>
                <span className="value">{getEstimatedDeliveryTime()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tracking-progress-container">
          <div className="current-status-banner">
            <div className="status-icon">
              {statusSteps[currentStatusIndex]?.icon}
            </div>
            <div className="status-info">
              <h2>Current Status</h2>
              <p className="status-text">
                {order.status.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>

          <div className="progress-steps">
            {statusSteps.map((step, index) => (
              <div 
                key={step.status} 
                className={`progress-step ${index <= currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'current' : ''}`}
              >
                <div className="step-indicator">
                  <div className="step-circle">
                    {index <= currentStatusIndex ? '✓' : index + 1}
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className="step-connector"></div>
                  )}
                </div>
                <div className="step-content">
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-info">
                    <h4 className="step-title">{step.label}</h4>
                    <p className="step-description">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="order-items">
            <h3>Order Items</h3>
            <div className="items-list">
              {order.items.map((item, index) => (
                <div key={index} className="order-item">
                  <span className="item-name">
                    {item.quantity}x {item.menuItem?.name}
                  </span>
                  <span className="item-price">
                    HK$ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tracking-actions">
          <button 
            className="support-btn"
            onClick={() => alert('Customer support: 852-1234-5678')}
          >
            📞 Contact Support
          </button>
          <button 
            className="reorder-btn"
            onClick={() => window.location.href = `/restaurant/${order.restaurant?._id}`}
          >
            🔄 Order Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tracking;