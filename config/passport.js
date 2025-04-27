import dotenv from 'dotenv';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import LocalStrategy from 'passport-local';
import User from '../models/userModel.js';
import bcrypt from 'bcrypt';

dotenv.config();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
    passReqToCallback: true, // Important for handling CORS
    proxy: true // Handle potential proxy issues
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      // admin 
      
      if (!user) {
        // Create new user if not exists
        const role = profile.emails[0].value === "kopisusu8ip@gmail.com" ? "designer" : "client";

        // Buat user baru jika tidak ditemukan
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          role: role,
          isVerified: true,
          profilePhoto: profile._json.picture
        });
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
));

// Local Strategy for Email/Password
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // Cari user berdasarkan email
        const user = await User.findOne({ email });
        
        if (!user) {
          return done(null, false, { message: 'Incorrect email.' });
        }

        // Pastikan user memiliki password sebelum membandingkan
        if (!user.password) {
          return done(null, false, { message: 'Password not found.' });
        }

        // Bandingkan password yang diinput dengan yang ada di database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;