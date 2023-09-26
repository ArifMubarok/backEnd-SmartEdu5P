import express from 'express';
import authController from '../controllers/authController.js';
import commentController from '../controllers/commentController.js';

const router = express.Router();

router.use(authController.protect);
router.route('/').post(commentController.commentProject);
router.route('/:id').delete(commentController.deleteComment);

export default router;
