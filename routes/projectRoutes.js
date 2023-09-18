import express from 'express';

import projectController from '../controllers/projectController.js';
import authController from '../controllers/authController.js';
import logbookRouter from '../routes/logbookRoutes.js';

const router = express.Router();

router.use(authController.protect);
router.use('/:projectId/logbooks', logbookRouter);

router.get('/testGetAllProject', projectController.getAllProjectTest);
router
  .route('/')
  .get(projectController.getAllProject)
  .post(authController.restrictTo('siswa'), projectController.createProject);
router
  .route('/:id')
  .get(projectController.getProject)
  .patch(
    authController.restrictTo('siswa'),
    projectController.checkIsChairman,
    projectController.checkMembersField,
    projectController.updateProject
  )
  .delete(authController.restrictTo('siswa'), projectController.checkIsChairman, projectController.deleteProject);
router.patch(
  '/:id/results',
  authController.restrictTo('siswa'),
  projectController.checkIsChairman,
  projectController.uploadFileResults,
  projectController.uploadResults
);
router.patch('/:id/publish', authController.restrictTo('guru'), projectController.publishProject);
router.patch('/:id/activate', authController.restrictTo('siswa'), projectController.activateProject);

export default router;
