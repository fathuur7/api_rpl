import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Simpan data user di req.user
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export const isClient = (req, res, next) => {
  // Check if authenticated (Passport adds user to req)
  if (!req.isAuthenticated()) {
    return res.status(401).json({ msg: 'You must be logged in' });
  }
  
  // Check if user has designer role
  if (req.user.role !== 'client') {
    return res.status(403).json({ msg: 'Access denied. Not authorized as designer' });
  }
  
  next();
};

export const auth = (req, res, next) => {
  // Check if authenticated (Passport adds user to req)
  if (!req.isAuthenticated()) {
    return res.status(401).json({ msg: 'You must be logged in' });
  }

  next();
};


// middleware/checkRole.js
export const checkRole = (role) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ msg: 'Not authorized' });
      }
  
      if (req.user.role !== role) {
        return res.status(403).json({ msg: 'Not authorized as ' + role });
      }
  
      next();
    };
  };
  

