
// models/ServiceRequest.js
import mongoose from 'mongoose';

const service = new mongoose.Schema({
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
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  budget: { 
    type: Number, 
    required: true 
  },
  deadline: { 
    type: Date,
    required: true 
  },
  attachments: [{ 
    type: String  // URL file referensi
  }],
  status: { 
    type: String, 
    enum: ['open', 'assigned', 'completed', 'cancelled'], 
    default: 'open' 
  }
}, { 
  timestamps: true 
});


const Service = mongoose.model('Service', service);
export default Service;