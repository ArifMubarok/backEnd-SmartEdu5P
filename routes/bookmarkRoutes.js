import express from 'express';
import authController from '../controllers/authController.js';
import bookmarkController from '../controllers/bookmarkController.js';

const router = express.Router();

router.use(authController.protect);
router
  .route('/')
  .get(bookmarkController.bookmarkedProjectByUser)
  .post(bookmarkController.bookmarkProject)
  .delete(bookmarkController.unbookmarkProject);

export default router;
