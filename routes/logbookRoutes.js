import express from 'express';

import logbookController from '../controllers/logbookController.js';
import authController from '../controllers/authController.js';

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.use(logbookController.currentProject);
router
  .route('/')
  .get(logbookController.getAllLogbooks)
  .post(authController.restrictTo('siswa'), logbookController.uploadSupportFiles, logbookController.createLogbook);
router
  .route('/:id')
  .get(logbookController.getLogbook)
  .patch(authController.restrictTo('siswa'), logbookController.uploadSupportFiles, logbookController.updateLogbook)
  .delete(authController.restrictTo('siswa'), logbookController.deleteLogbook);
router.route('/:id/validate').patch(authController.restrictTo('guru'), logbookController.validateLogbook);

export default router;
