import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createStatus,
  deleteStatus,
  getStatuses,
  updateStatus,
  viewStatus,
} from '../controllers/statusController.js';

const router = express.Router();

router.use(protect);

router.get('/', getStatuses);
router.post('/', createStatus);
router.patch('/:statusId', updateStatus);
router.delete('/:statusId', deleteStatus);
router.post('/:statusId/view', viewStatus);

export default router;
