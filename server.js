import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth/authRoutes.js";
import cookieParser from "cookie-parser";


dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// CORS Middleware
const corsOptions = {
  origin: ["http://localhost:3000", "http://192.168.1.56:3000"],
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
app.use(cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Uncomment if needed for dummy data
// createDummyTransactions();

// Start the server
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
