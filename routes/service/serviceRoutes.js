// import passport from '../../config/passport.js';
import {
    createServiceRequest,
    getAllClientServiceRequests,
    deleteServiceRequest,
    getServiceRequest
} from '../../controllers/service/serviceControllers.js';
import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllClientServiceRequests, authMiddleware); // Get all services
router.post('/', createServiceRequest); // Create a new service
router.get('/:id', getServiceRequest); // Get a single service
router.delete('/:id', deleteServiceRequest); // Delete a service

// http://localhost:5000/api/services for get all services

export default router;