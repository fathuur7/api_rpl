// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
<<<<<<< HEAD
  googleId: { 
    type: String, 
    unique: true,
    sparse: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String 
  },
  role: { 
    type: String, 
    enum: ['client', 'designer'], 
    default: 'client' 
  },
  profilePhoto: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { 
  timestamps: true 
=======
    background : {
        type: String,
        // required: true
    },
    image : {
        type: String,
    },
    location: {
        type: String,
        // required: true
    },
    aboutme : {
        type: String,
        // required: true
    },
    avalaible : {
        type: String,
        // required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    telegram: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
>>>>>>> 49827e9c3e0e53bb0b03dbbffa28eb12d81bb6d4
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password validity
userSchema.methods.validatePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

<<<<<<< HEAD
const User = mongoose.model('User', userSchema);

export default User;
=======
// Fungsi untuk validasi menggunakan Joi
export const validateUser = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(40).required(),
        email: Joi.string().email().required(),
        telegram: Joi.string().min(3).required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid("user", "admin").optional().default("user"), 
        location: Joi.string().required(),
        aboutme: Joi.string().required(),
        avalaible: Joi.string().required(),
        image: Joi.string().required(),
    });
    return schema.validate(data);
};

// Fungsi untuk validasi input login menggunakan Joi
export const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    return schema.validate(data);
};

userSchema.set("toJSON", { virtuals: true });
userSchema.virtual("id").get(function () {
    return this._id.toHexString();
});

const User = mongoose.model("User", userSchema);

export default User;
>>>>>>> 49827e9c3e0e53bb0b03dbbffa28eb12d81bb6d4
