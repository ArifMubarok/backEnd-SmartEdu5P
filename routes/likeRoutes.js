import express from 'express';

import authController from '../controllers/authController.js';
import likeController from '../controllers/likeController.js';

const router = express.Router();
router.use(authController.protect);
router
  .route('/')
  .get(likeController.likeByCurrentUser)
  .post(likeController.likeProject)
  .delete(likeController.unlikeProject);
export default router;
