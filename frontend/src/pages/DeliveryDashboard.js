import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const DeliveryDashboard = () => {
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login as a delivery person');
      return;
    }

    const newSocket = io('http://localhost:5000', { auth: { token } });
    setSocket(newSocket);

    // Listen for order_taken event to refresh available list
    newSocket.on('order_taken', (data) => {
      setAvailableOrders(prev => prev.filter(order => order._id !== data.orderId));
    });

    fetchOrders();

    return () => newSocket.close();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      const [assignedRes, availableRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders/delivery/my-assignments', { headers }),
        axios.get('http://localhost:5000/api/orders/available', { headers })
      ]);
      
      setAssignedOrders(assignedRes.data);
      setAvailableOrders(availableRes.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/orders/${orderId}/accept`, {}, {
        headers: { 'x-auth-token': token }
      });
      alert('Order accepted! It will appear in your active deliveries.');
      fetchOrders(); // refresh both lists
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to accept order');
    }
  };

  const startLocationTracking = (orderId) => {
    if (!socket) return;
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    setTrackingActive(true);
    setActiveOrderId(orderId);
    socket.emit('start_delivery_tracking', orderId);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        socket.emit('update_location', { orderId, lat: latitude, lng: longitude });
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    window.locationWatchId = watchId;
  };

  const stopLocationTracking = () => {
    if (window.locationWatchId) {
      navigator.geolocation.clearWatch(window.locationWatchId);
      window.locationWatchId = null;
    }
    setTrackingActive(false);
    setActiveOrderId(null);
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/orders/${orderId}/status`, { status }, {
        headers: { 'x-auth-token': token }
      });
      alert(`Order status updated to ${status}`);
      if (status === 'delivered') stopLocationTracking();
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="delivery-dashboard">
      <div className="container">
        <h1>🚚 Delivery Dashboard</h1>

        {/* Your Active Deliveries */}
        <section className="active-deliveries">
          <h2>Your Active Deliveries</h2>
          {assignedOrders.length === 0 ? (
            <p>No active deliveries.</p>
          ) : (
            assignedOrders.map(order => (
              <div key={order._id} className="order-card">
                <h3>Order #{order._id.slice(-6)}</h3>
                <p><strong>Restaurant:</strong> {order.restaurant?.name}</p>
                <p><strong>Customer:</strong> {order.user?.name}</p>
                <p><strong>Address:</strong> {order.deliveryAddress}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <div className="actions">
                  {order.status === 'out_for_delivery' && (
                    <>
                      {trackingActive && activeOrderId === order._id ? (
                        <button onClick={stopLocationTracking}>Stop Tracking</button>
                      ) : (
                        <button onClick={() => startLocationTracking(order._id)}>Start Live Tracking</button>
                      )}
                      <button onClick={() => updateOrderStatus(order._id, 'delivered')}>Mark Delivered</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Available Orders */}
        <section className="available-orders">
          <h2>Available Orders (Ready for Pickup)</h2>
          {availableOrders.length === 0 ? (
            <p>No orders available at the moment.</p>
          ) : (
            availableOrders.map(order => (
              <div key={order._id} className="order-card available">
                <h3>Order #{order._id.slice(-6)}</h3>
                <p><strong>Restaurant:</strong> {order.restaurant?.name}</p>
                <p><strong>Delivery Address:</strong> {order.deliveryAddress}</p>
                <p><strong>Total:</strong> HK$ {order.totalAmount?.toFixed(2)}</p>
                <button onClick={() => acceptOrder(order._id)} className="accept-btn">
                  ✅ Accept Order
                </button>
              </div>
            ))
          )}
        </section>

        {currentLocation && trackingActive && (
          <div className="current-location">
            <h3>📍 Sharing live location for order #{activeOrderId?.slice(-6)}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;