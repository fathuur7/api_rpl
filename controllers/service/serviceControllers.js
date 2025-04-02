
import Service from '../../models/serviceModel.js';

export const createServiceRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
      
    const { category, title, description, budget, deadline, attachments } = req.body;
    
    const newServiceRequest = new Service({
      client: req.user._id, 
      category,
      title,
      description,
      budget,
      deadline: new Date(deadline),
      attachments,
      status: 'open',
      makRevisions: 3
    });
    
    const serviceRequest = await newServiceRequest.save();
    res.status(201).json(serviceRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

export const getAllClientServiceRequests = async (req, res) => {
  try {
    console.log(req.user._id);
    const serviceRequests = await Service.find({ client: req.user._id })
      .populate('category', 'name')
      .sort({ createdAt: -1 });
      
    res.json(serviceRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const getServiceRequest = async (req, res) => {
  try {
    const serviceRequest = await Service.find({_id: req.params.id})
      .populate('client', 'name email profilePhoto')
      .populate('category', 'name');
      
    if (!serviceRequest) {
      return res.status(404).json({ message: 'Permintaan layanan tidak ditemukan' });
    }
    
    res.json(serviceRequest);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Permintaan layanan tidak ditemukan' });
    }
    res.status(500).json({ message: 'Server error' });
  }
}

export const deleteServiceRequest = async (req, res) => {
  try {
    const serviceRequest = await Service.findById(req.params.id);
    
    if (!serviceRequest) {
      return res.status(404).json({ message: 'Permintaan layanan tidak ditemukan' });
    }
    
    // Verifikasi bahwa client adalah pemilik permintaan
    if (serviceRequest.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    
    // Jika status sudah tidak 'open', tidak bisa dihapus
    if (serviceRequest.status !== 'open') {
      return res.status(400).json({ message: 'Permintaan yang sudah di-assign tidak dapat dihapus' });
    }
    
    await serviceRequest.deleteOne();
    
    res.json({ message: 'Permintaan layanan berhasil dihapus' });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Permintaan layanan tidak ditemukan' });
    }
    res.status(500).json({ message: 'Server error' });
  }
}

export const updateServiceRequest =  async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }
    
    // Check if the user is the owner of the service request
    if (service.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this service request' });
    }
    
    const { category, title, description, budget, deadline, attachments, status } = req.body;
    
    // Only update fields that are provided
    if (category) service.category = category;
    if (title) service.title = title;
    if (description) service.description = description;
    if (budget) service.budget = budget;
    if (deadline) service.deadline = deadline;
    if (attachments) service.attachments = attachments;
    if (status) service.status = status;
    
    const updatedService = await service.save();
    
    res.json(updatedService);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// get
