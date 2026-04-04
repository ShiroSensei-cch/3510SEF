import React from 'react';
import { Link } from 'react-router-dom';

const RestaurantCard = ({ restaurant }) => {
  return (
    <div className="restaurant-card">
      <div className="restaurant-image">
        <img src={restaurant.image} alt={restaurant.name} />
      </div>
      <div className="restaurant-info">
        <h3>{restaurant.name}</h3>
        <p className="cuisine">{restaurant.cuisine}</p>
        <p className="delivery-time">🕐 {restaurant.deliveryTime}</p>
        <p className="rating">⭐ {restaurant.rating}/5</p>
        <p className="address">{restaurant.address}</p>
        <Link to={`/restaurant/${restaurant._id}`} className="view-menu-btn">
          View Menu
        </Link>
      </div>
    </div>
  );
};

export default RestaurantCard;