# TableMint 🍽️

A full-stack restaurant management and booking platform built with **MERN Stack** + Android Captain App.

## ✨ Features

### For Customers
- Browse and search restaurants
- View restaurant details, menu, and reviews
- Real-time "Near Me" location-based recommendations
- Table booking with instant or scheduled options
- Pre-order food while booking
- Group planning with friends (Chat + Restaurant Sharing + Polling)

### For Restaurant Owners/Admins
- Manage reservations and bookings
- Update menu items
- View analytics (revenue, no-shows, party size, etc.)
- Dashboard with real-time insights

### Group Planning (Social Feature)
- Create dinner plans with friends
- Real-time group chat
- Share restaurants directly in chat
- Create polls and vote on where to go
- Live vote updates

### Admin Panel
- Manage all restaurants and reservations
- Platform-wide analytics

## 🛠️ Tech Stack

**Frontend:** React.js, Tailwind CSS  
**Backend:** Node.js, Express.js  
**Database:** MongoDB  
**Realtime:** Socket.io  
**Mobile (Captain App):** Kotlin (Android)  
**Authentication:** JWT  

## 📁 Project Structure
tablemint/
├── tablemint-web/              # React Frontend
├── tablemint-backend/          # Node.js + Express Backend
├── tablemint-captain-app/      # Android Captain App (Kotlin)
├── README.md
└── .env.example


## 🚀 How to Run

### 1. Backend

```bash
cd tablemint-backend
npm install
cp .env.example .env

Update .env with your MongoDB URI and JWT secret.
npm start
Backend runs on http://localhost:5000
2. Frontend
Bashcd tablemint-web
npm install
npm start
Frontend runs on http://localhost:3000
3. Captain App (Android)
Open the project in Android Studio and run on emulator/device.

📌 Key Features Implemented

✅ User Authentication (JWT)
✅ Restaurant Browsing & Search
✅ Real-time Group Chat + Voting
✅ Restaurant Sharing in Groups
✅ "Near Me" Location Feature (MongoDB Geospatial)
✅ Owner Dashboard (Reservations, Menu, Analytics)
✅ Admin Panel

🗂️ Available Routes
Backend:

/api/auth → Login/Register
/api/restaurants → Restaurant CRUD
/api/restaurants/nearby → Location-based search
/api/groups → Group planning
/api/owner/* → Owner specific routes
/api/admin/* → Admin routes



📄 License
This project is built for educational purposes (College Project).
