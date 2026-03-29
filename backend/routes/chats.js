/**
 * Chat Routes
 */
import express from 'express';
import {
  accessChat,
  getMyChats,
  getChatById,
  createGroupChat,
  addToGroup,
  removeFromGroup,
  updateGroup,
  makeAdmin,
  deleteChat,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/access', accessChat);
router.get('/', getMyChats);
router.get('/:chatId', getChatById);
router.post('/group', createGroupChat);
router.patch('/group/add', addToGroup);
router.patch('/group/remove', removeFromGroup);
router.patch('/group/admin', makeAdmin);
router.patch('/:chatId', updateGroup);
router.delete('/:chatId', deleteChat);

export default router;
