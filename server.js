// app.js or server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

// Configuration imports
import connectDB from "./config/db.js";
import passport from './config/passport.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
// Route imports
import authRoutes from "./routes/auth/authRoutes.js";
import categoryRoutes from "./routes/category/categoryRoutes.js";
import userRoutes from "./routes/users/userRoutes.js";
import serviceRoutes from "./routes/service/serviceRoutes.js";
import designerServiceRoutes from "./routes/service/serviceDesainerRoutes.js";
import orderRoutes from "./routes/orders/orderRoutes.js";
import paymentRoutes from "./routes/payment/paymentRoutes.js";
import deliverableRoutes from "./routes/delivare/delivRoutes.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet()); // Helps secure Express apps by setting HTTP headers
app.disable('x-powered-by'); // Reduces fingerprinting

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Compression for better performance
app.use(compression());

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000",
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: { 
    secure: false, 
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax' 
  }
}));

// Authentication
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('User from session:', req.user);
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  console.log('Request Cookies:', req.cookies);
  console.log('Request Params:', req.params);
  next();
});


// Development logging middleware
if (!isProduction) {
  app.use((req, res, next) => {
    console.log('User from session:', req.user);
    next();
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// API Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: "Welcome to the API", version: "1.0.0" });
});

// Mount route modules
const apiRoutes = express.Router();
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/services', serviceRoutes);
apiRoutes.use('/designer', designerServiceRoutes);
apiRoutes.use('/orders', orderRoutes);
apiRoutes.use('/payments', paymentRoutes);
apiRoutes.use('/deliverables', deliverableRoutes);


// Apply API routes with versioning
app.use('/api/v1', apiRoutes);

// Error Handling
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Global error handler

// Start the server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export default app;