// routes/deliverableRoutes.js
import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  createDeliverable,
  getOrderDeliverables,
  getDeliverable,
  updateDeliverable,
  reviewDeliverable,
  deleteDeliverable,
  getFileUrl,
  downloadFile,
  getDesignerDeliverables,
  getClientDeliverables
} from '../../controllers/delivare/delivareController.js';

const router = express.Router();

// Set up multer for memory storage (we'll handle file saving in the controller)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});


// Middleware to check if user is authenticated
// router.use(authMiddleware);

// Routes
router.post('/', upload.single('file'), createDeliverable);
router.get('/order/:orderId', getOrderDeliverables);
router.get('/designer',getDesignerDeliverables);
router.get('/client', getClientDeliverables);
router.get('/:id', getDeliverable);
router.put('/:id', upload.single('file'), updateDeliverable);
router.patch('/:id/review', reviewDeliverable);
router.delete('/:id', deleteDeliverable);
router.get('/:id/fileUrl' ,getFileUrl);
router.get('/:id/download', downloadFile);

export default router;