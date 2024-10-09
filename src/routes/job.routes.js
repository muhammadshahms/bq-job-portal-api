import { Router } from 'express';
import {
        createJob,
        deleteJob,
        getJobByCompany,
        getJobById,
        getJobs,
        getDraftJobs,
        saveDraftJob,
        skillsMatch, 
} from '../controllers/job.controller.js';
import { verifyCompany } from '../middlewares/auth.middleware.js';


const router = Router();
router.post('/create-job', createJob);
router.get('/jobs', getJobs);
router.get('/id', getJobById);
router.get('/name', getJobByCompany);
router.get('/jobData/:skills', skillsMatch)
router.post('/delete-job', deleteJob);
router.get('/drafts', getDraftJobs);
router.post('/save-draft/:id?', saveDraftJob); 

export default router;