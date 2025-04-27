import dotenv from 'dotenv';

dotenv.config();

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key',
  options: {
    expiresIn: '7d' // Token expires in 7 days
  },
  refreshOptions: {
    expiresIn: '30d' // Refresh token expires in 30 days
  }
};

export default jwtConfig;