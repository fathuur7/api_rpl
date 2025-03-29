import {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    updateServiceStatus
} from '../../controllers/service/serviceControllers.js';
import express from 'express';

const router = express.Router();

router.get('/', getAllServices); // Get all services
router.post('/', createService); // Create a new service
router.get('/:id', getServiceById); // Get service by ID
router.put('/:id', updateService); // Update a service
router.delete('/:id', deleteService); // Delete a service
router.patch('/:id/status', updateServiceStatus); // Update service status (admin only)

export default router;