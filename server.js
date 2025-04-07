import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth/authRoutes.js";
import cookieParser from "cookie-parser";
import session from 'express-session';
import passport from './config/passport.js';
import categoryRoutes from "./routes/category/categoryRoutes.js";
import userRoutes from "./routes/users/userRoutes.js";
import serviceRoutes from "./routes/service/serviceRoutes.js";
import designerServiceRoutes from "./controllers/service/serviceControllersDesainer.js";
import orderRoutes from "./routes/orders/orderRoutes.js";
import paymentRoutes from "./routes/payment/paymentRoutes.js";


dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();



// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true , limit: '50mb'}));
app.use(cookieParser());

// CORS Middleware
const corsOptions = {
  origin: "http://localhost:3000", // Hapus duplikasi
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    httpOnly: true // Tambahkan httpOnly untuk keamanan
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('User from session:', req.user);
  next();
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/designer', designerServiceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});