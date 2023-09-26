import express from 'express';
import searchController from '../controllers/searchController.js';

const router = express.Router();

router.route('/').get(searchController.search);

export default router;
