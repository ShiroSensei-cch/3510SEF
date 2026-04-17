import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const RestaurantDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Fetch restaurant and orders
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Socket connection (for real‑time updates)
    const newSocket = io('http://localhost:5000', { auth: { token } });
    setSocket(newSocket);

    // Listen for order status updates from backend
    newSocket.on('order_status_updated', (data) => {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === data.orderId ? { ...order, status: data.status } : order
        )
      );
    });

    fetchData();
    return () => newSocket.close();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      // 1. Get restaurant owned by this user
      const restaurantRes = await axios.get('http://localhost:5000/api/restaurants/my-restaurant', { headers });
      setRestaurant(restaurantRes.data);

      // 2. Get orders for that restaurant
      const ordersRes = await axios.get(`http://localhost:5000/api/orders/restaurant/${restaurantRes.data._id}`, { headers });
      setOrders(ordersRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );
      // Optimistically update local state (socket will also update)
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const getNextStatus = (currentStatus) => {
    const flow = ['placed', 'confirmed', 'preparing', 'out_for_delivery'];
    const idx = flow.indexOf(currentStatus);
    if (idx !== -1 && idx < flow.length - 1) return flow[idx + 1];
    return null;
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!restaurant) return <div>No restaurant found. Please contact admin.</div>;

  return (
    <div className="restaurant-dashboard">
      <div className="container">
        <h1>🍽️ {restaurant.name} – Orders</h1>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div className="orders-list">
            {orders.map(order => {
              const nextStatus = getNextStatus(order.status);
              return (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <span className="order-id">Order #{order._id.slice(-6)}</span>
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                  </div>
                  <div className="order-details">
                    <p><strong>Customer:</strong> {order.user?.name} ({order.user?.phone})</p>
                    <p><strong>Address:</strong> {order.deliveryAddress}</p>
                    <p><strong>Total:</strong> HK$ {order.totalAmount?.toFixed(2)}</p>
                    <div className="items-list">
                      {order.items?.map((item, i) => (
                        <div key={i}>{item.quantity}x {item.menuItem?.name} – HK$ {item.price}</div>
                      ))}
                    </div>
                  </div>
                  {nextStatus && (
                    <button 
                      className="update-btn"
                      onClick={() => updateOrderStatus(order._id, nextStatus)}
                    >
                      Move to {nextStatus.replace(/_/g, ' ')} →
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && !order.assignedDeliveryPerson && (
                    <p className="info">⏳ Waiting for a delivery person to accept...</p>
                  )}
                  {order.assignedDeliveryPerson && (
                    <p className="info">🚚 Assigned to delivery person</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;