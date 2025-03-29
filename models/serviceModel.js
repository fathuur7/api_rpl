import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  revisionLimit: { 
    type: Number, 
    default: 3 
  },
  deliveryTime: { 
    type: Number, // dalam hari
    required: true 
  },
  images: [{ 
    type: String,  // URL gambar layanan
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'declined'], 
    default: 'pending' 
  }
}, { 
  timestamps: true 
});

const Service = mongoose.model('Service', serviceSchema);
export default Service;
