import { Router } from 'express';
import { createJob, 
         deleteJob, 
         getJobById, 
         getJobs, 
         getJobByCompany
 } from '../controllers/job.controller.js';
import { verifyCompany } from '../middlewares/auth.middleware.js';


const router = Router();
router.post('/create-job', verifyCompany, createJob);
router.post('/jobs', getJobs);
router.post('/jobs:id', getJobById);
router.post('/jobs:name', getJobByCompany);
router.post('/delete-job', deleteJob);


export default router;