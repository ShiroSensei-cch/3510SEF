const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Restaurant = require('./models/Restaurant');
const Menu = require('./models/Menu');
const User = require('./models/User');
require('dotenv').config();

const sampleData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');


    // ---------- 1. Create or find restaurant owner accounts ----------
    const ownerEmails = [
      'pizza.owner@example.com',
      'burger.owner@example.com',
      'sushi.owner@example.com'
    ];

    const ownerPasswords = ['owner123', 'owner123', 'owner123']; 

    const owners = [];
    for (let i = 0; i < ownerEmails.length; i++) {
      let user = await User.findOne({ email: ownerEmails[i] });
      if (!user) {
        const hashedPassword = await bcrypt.hash(ownerPasswords[i], 10);
        user = new User({
          name: `${ownerEmails[i].split('@')[0]}`, // e.g., "pizza.owner"
          email: ownerEmails[i],
          password: hashedPassword,
          role: 'restaurant_owner',
          address: 'Owner Address',
          phone: '12345678'
        });
        await user.save();
        console.log(`Created owner: ${user.email} (${user.name})`);
      } else {
        console.log(`Owner already exists: ${user.email}`);
      }
      owners.push(user);
    }

    // ---------- 2. Create or update restaurants with owners ----------
    const restaurantData = [
      {
        name: "Pizza Palace",
        description: "The best pizza in town with fresh ingredients and authentic recipes",
        address: "18 Temple Street, Yau Ma Tei",
        phone: "(852) 2384 5678",
        cuisine: "Italian",
        deliveryTime: "25-35 min",
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=2070&q=80",
        owner: owners[0]._id
      },
      {
        name: "Burger Barn",
        description: "Juicy burgers, crispy fries, and cold drinks",
        address: "75 Nathan Road, Tsim Sha Tsui",
        phone: "(852) 2367 3344",
        cuisine: "American",
        deliveryTime: "20-30 min",
        rating: 4.2,
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=2072&q=80",
        owner: owners[1]._id
      },
      {
        name: "Sushi Spot",
        description: "Fresh sushi and authentic Japanese cuisine",
        address: "42 Queen's Road Central, Central",
        phone: "(852) 2521 8899",
        cuisine: "Japanese",
        deliveryTime: "35-45 min",
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=2127&q=80",
        owner: owners[2]._id
      }
    ];

    const savedRestaurants = [];
    for (const data of restaurantData) {
      let restaurant = await Restaurant.findOne({ name: data.name });
      if (!restaurant) {
        restaurant = new Restaurant(data);
        await restaurant.save();
        console.log(`Created restaurant: ${restaurant.name}`);
      } else {
        // Update owner if needed
        if (!restaurant.owner) {
          restaurant.owner = data.owner;
          await restaurant.save();
          console.log(`Updated owner for restaurant: ${restaurant.name}`);
        } else {
          console.log(`Restaurant already exists: ${restaurant.name}`);
        }
      }
      savedRestaurants.push(restaurant);
    }

    // ---------- 3. Add menus (clear existing menus for these restaurants) ----------
    // Optional: remove old menus before adding new ones
    for (const restaurant of savedRestaurants) {
      await Menu.deleteMany({ restaurant: restaurant._id });
    }

    const menuData = [
      // Pizza Palace menu
      {
        restaurant: savedRestaurants[0]._id,
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce, fresh mozzarella, and basil",
        price: 110,
        category: "Pizza"
      },
      {
        restaurant: savedRestaurants[0]._id,
        name: "Pepperoni Pizza",
        description: "Traditional pizza with pepperoni and mozzarella cheese",
        price: 130,
        category: "Pizza"
      },
      {
        restaurant: savedRestaurants[0]._id,
        name: "Garlic Breadsticks",
        description: "Freshly baked breadsticks with garlic butter",
        price: 40,
        category: "Appetizers"
      },
      {
        restaurant: savedRestaurants[0]._id,
        name: "Caesar Salad",
        description: "Fresh romaine lettuce with Caesar dressing and croutons",
        price: 60,
        category: "Salads"
      },
      // Burger Barn menu
      {
        restaurant: savedRestaurants[1]._id,
        name: "Classic Cheeseburger",
        description: "Beef patty with cheese, lettuce, tomato, and special sauce",
        price: 70,
        category: "Burgers"
      },
      {
        restaurant: savedRestaurants[1]._id,
        name: "Bacon Burger",
        description: "Beef patty with crispy bacon and cheddar cheese",
        price: 85,
        category: "Burgers"
      },
      {
        restaurant: savedRestaurants[1]._id,
        name: "French Fries",
        description: "Crispy golden fries with sea salt",
        price: 32,
        category: "Sides"
      },
      {
        restaurant: savedRestaurants[1]._id,
        name: "Chocolate Milkshake",
        description: "Creamy chocolate milkshake with whipped cream",
        price: 27,
        category: "Drinks"
      },
      // Sushi Spot menu
      {
        restaurant: savedRestaurants[2]._id,
        name: "California Roll",
        description: "Crab, avocado, and cucumber roll",
        price: 39.9,
        category: "Sushi Rolls"
      },
      {
        restaurant: savedRestaurants[2]._id,
        name: "Salmon Nigiri",
        description: "Fresh salmon over seasoned rice",
        price: 69.9,
        category: "Nigiri"
      },
      {
        restaurant: savedRestaurants[2]._id,
        name: "Miso Soup",
        description: "Traditional Japanese soybean soup",
        price: 14.9,
        category: "Soups"
      },
      {
        restaurant: savedRestaurants[2]._id,
        name: "Edamame",
        description: "Steamed soybeans with sea salt",
        price: 24.9,
        category: "Appetizers"
      }
    ];

    await Menu.insertMany(menuData);
    console.log(`Added ${menuData.length} menu items`);

    console.log('\n✅ Sample data added successfully!');
    console.log('Owners:');
    for (let i = 0; i < owners.length; i++) {
      console.log(`   ${owners[i].email} (password: ${ownerPasswords[i]})`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample data:', error);
    process.exit(1);
  }
};

sampleData();