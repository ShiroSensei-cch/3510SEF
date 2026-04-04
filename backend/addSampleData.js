const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const Menu = require('./models/Menu');
require('dotenv').config();

const sampleData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await Restaurant.deleteMany({});
    await Menu.deleteMany({});

    // Create sample restaurants
    const restaurant1 = new Restaurant({
      name: "Pizza Palace",
      description: "The best pizza in town with fresh ingredients and authentic recipes",
      address: "18 Temple Street, Yau Ma Tei",
      phone: "(852) 2384 5678",
      cuisine: "Italian",
      deliveryTime: "25-35 min",
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    });

    const restaurant2 = new Restaurant({
      name: "Burger Barn",
      description: "Juicy burgers, crispy fries, and cold drinks",
      address: "75 Nathan Road, Tsim Sha Tsui",
      phone: "(852) 2367 3344",
      cuisine: "American",
      deliveryTime: "20-30 min",
      rating: 4.2,
      image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80"
    });

    const restaurant3 = new Restaurant({
      name: "Sushi Spot",
      description: "Fresh sushi and authentic Japanese cuisine",
      address: "42 Queen's Road Central, Central",
      phone: "(852) 2521 8899",
      cuisine: "Japanese",
      deliveryTime: "35-45 min",
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2127&q=80"
    });

    const savedRestaurant1 = await restaurant1.save();
    const savedRestaurant2 = await restaurant2.save();
    const savedRestaurant3 = await restaurant3.save();

    // Create sample menu items for Pizza Palace
    const pizzaPalaceMenu = [
      {
        restaurant: savedRestaurant1._id,
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce, fresh mozzarella, and basil",
        price: 110,
        category: "Pizza"
      },
      {
        restaurant: savedRestaurant1._id,
        name: "Pepperoni Pizza",
        description: "Traditional pizza with pepperoni and mozzarella cheese",
        price: 130,
        category: "Pizza"
      },
      {
        restaurant: savedRestaurant1._id,
        name: "Garlic Breadsticks",
        description: "Freshly baked breadsticks with garlic butter",
        price: 40,
        category: "Appetizers"
      },
      {
        restaurant: savedRestaurant1._id,
        name: "Caesar Salad",
        description: "Fresh romaine lettuce with Caesar dressing and croutons",
        price: 60,
        category: "Salads"
      }
    ];

    // Create sample menu items for Burger Barn
    const burgerBarnMenu = [
      {
        restaurant: savedRestaurant2._id,
        name: "Classic Cheeseburger",
        description: "Beef patty with cheese, lettuce, tomato, and special sauce",
        price: 70,
        category: "Burgers"
      },
      {
        restaurant: savedRestaurant2._id,
        name: "Bacon Burger",
        description: "Beef patty with crispy bacon and cheddar cheese",
        price: 85,
        category: "Burgers"
      },
      {
        restaurant: savedRestaurant2._id,
        name: "French Fries",
        description: "Crispy golden fries with sea salt",
        price: 32,
        category: "Sides"
      },
      {
        restaurant: savedRestaurant2._id,
        name: "Chocolate Milkshake",
        description: "Creamy chocolate milkshake with whipped cream",
        price: 27,
        category: "Drinks"
      }
    ];

    // Create sample menu items for Sushi Spot
    const sushiSpotMenu = [
      {
        restaurant: savedRestaurant3._id,
        name: "California Roll",
        description: "Crab, avocado, and cucumber roll",
        price: 39.9,
        category: "Sushi Rolls"
      },
      {
        restaurant: savedRestaurant3._id,
        name: "Salmon Nigiri",
        description: "Fresh salmon over seasoned rice",
        price: 69.9,
        category: "Nigiri"
      },
      {
        restaurant: savedRestaurant3._id,
        name: "Miso Soup",
        description: "Traditional Japanese soybean soup",
        price: 14.9,
        category: "Soups"
      },
      {
        restaurant: savedRestaurant3._id,
        name: "Edamame",
        description: "Steamed soybeans with sea salt",
        price: 24.9,
        category: "Appetizers"
      }
    ];

    await Menu.insertMany([...pizzaPalaceMenu, ...burgerBarnMenu, ...sushiSpotMenu]);
    console.log('Sample data added successfully!');
    console.log(`Added 3 restaurants and ${pizzaPalaceMenu.length + burgerBarnMenu.length + sushiSpotMenu.length} menu items`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample data:', error);
    process.exit(1);
  }
};

sampleData();