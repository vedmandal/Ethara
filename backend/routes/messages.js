/**
 * Message Routes
 */
import express from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsSeen,
  searchMessages,
  addReaction,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchMessages);
router.get('/:chatId', getMessages);
router.post('/', sendMessage);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.patch('/seen/:chatId', markAsSeen);
router.patch('/:messageId/reaction', addReaction);

export default router;
