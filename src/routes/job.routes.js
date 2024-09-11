import { Router } from 'express'
import { createJob } from '../controllers/job.controller.js';
import { verifyCompany } from '../middlewares/auth.middleware.js';
import { singleAvatar } from '../middlewares/multer.middleware.js';

const router = Router();

router.post('/create-job', verifyCompany, singleAvatar ,createJob);

export default router