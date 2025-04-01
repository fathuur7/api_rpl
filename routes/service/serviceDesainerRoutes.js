// import passport from '../../config/passport.js';
import {
    createServiceRequest,
    getAllClientServiceRequests,
    deleteServiceRequest,
    getServiceRequest,
    updateServiceRequest
    // getAllOpenServiceRequests
} from '../../controllers/service/serviceControllersDesainer.js';
import express from 'express';

const router = express.Router();

router.get('/', getServiceRequest); // Get a single service


// router.get('/open', getAllOpenServiceRequests); // Get all open services


// http://localhost:5000/api/services/desainer for get all services

export default router;