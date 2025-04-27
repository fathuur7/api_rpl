// import passport from '../../config/passport.js';
import {
    CancelService,
    getAllDesignerServiceRequests,
    getDesignerServiceRequestById,
    getDesignerServiceRequestsByCategory,
    applyForServiceRequest
} from '../../controllers/service/serviceControllersDesainer.js';
import express from 'express';
import { isDesigner } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.put('/services/:id/apply', isDesigner, applyForServiceRequest); 
router.get('/services/category/:categoryId', isDesigner, getDesignerServiceRequestsByCategory); 
router.get('/services/:id', isDesigner, getDesignerServiceRequestById); 
router.get('/services', isDesigner, getAllDesignerServiceRequests); 
router.put('/services/:id/cancel', isDesigner, CancelService); // Apply for a service request


export default router;