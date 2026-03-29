/**
 * Group Routes (delegates to chatController group functions)
 */
import express from 'express';
import { protect } from '../middleware/auth.js';
import { createGroupChat, addToGroup, removeFromGroup, makeAdmin, updateGroup } from '../controllers/chatController.js';

const router = express.Router();
router.use(protect);

router.post('/', createGroupChat);
router.patch('/add', addToGroup);
router.patch('/remove', removeFromGroup);
router.patch('/admin', makeAdmin);
router.patch('/:chatId', updateGroup);

export default router;
