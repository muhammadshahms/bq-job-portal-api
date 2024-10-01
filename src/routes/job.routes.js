import { Router } from 'express';
import {
        createJob,
        deleteJob,
        getJobByCompany,
        getJobById,
        getJobs,
        getDraftJobs,
        saveDraftJob,
} from '../controllers/job.controller.js';
import { verifyCompany } from '../middlewares/auth.middleware.js';


const router = Router();
router.post('/create-job', verifyCompany, createJob);
router.get('/jobs', getJobs);
router.get('/id', getJobById);
router.get('/jobs:name', getJobByCompany);
router.post('/delete-job', deleteJob);
router.get('/drafts', getDraftJobs);
router.post('/save-draft/:id?', saveDraftJob); // Use the ID param for updating drafts



export default router;