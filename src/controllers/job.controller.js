import { Job } from "../models/job.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { seedJobs } from '../../seeder.js';

const createJob = asyncHandler(async (req, res, next) => {
    const { company, applicant, positions_available, remaining_positions, last_date, currently_hiring, job_type, job_title, gender_preference, no_of_employees, hiring_manager, documents_required, company_mail, about, education, skills, good_to_have, experience } = req.body;

    console.log(req.company)

    if (!company, !positions_available, !remaining_positions, !last_date, !currently_hiring, !job_type, !job_title, !gender_preference, !no_of_employees, !hiring_manager, !documents_required, !company_mail, !about, !education, !skills, !good_to_have, !experience)
        return next(new ApiError(400, "All fields are required"));



    // await job.create({
    //     company : req?.company?._id,
    //     applicant, 
    //     positions_available, 
    //     remaining_positions, 
    //     last_date, 
    //     currently_hiring, 
    //     job_type, job_title, 
    //     gender_preference, 
    //     no_of_employees, 
    //     hiring_manager, 
    //     documents_required, 
    //     company_mail, 
    //     about, education, 
    //     skills, 
    //     good_to_have, 
    //     experience
    // });

    return res.status(201).json(
        new ApiResponse(
            201,
            "Job Created Successfully",)
    );
});

const getJobs = asyncHandler(async (req, res, next) => {
    const jobs = await Job.find();
    // const seedData = await seedJobs();
    if (!jobs) {
        return next(new ApiError(404, 'No job found'))
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            jobs,
            "Jobs fetched successfully"
        )
    )
});

const getJobById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    // const dataId = await seedJobs();


    // if (!id) {
    //     throw new ApiError(400, 'Job Id is required');
    // }

    const jobs = await Job.findById(id);

    if (!jobs || jobs.length === 0) {
        throw new ApiError(404, 'No jobs found');
    }

    res.status(200).json({
        data: jobs,
        message: 'Jobs found successfully'
    });
});

const getJobByCompany = asyncHandler(async (req, res, next) => {
    const { companyId } = req.body;

    if (!companyId) {
        throw new ApiError(400, 'company name is required');
    }

    const jobs = await Job.find({ _id: companyId });

    if (!jobs || jobs.length === 0) {
        throw new ApiError(404, 'No jobs found');
    }

    res.status(200).json({
        data: jobs,
        message: 'Jobs found successfully'
    });
});

const deleteJob = asyncHandler(async (req, res, next) => {


    const { id } = req.params;

    const jobToDelete = await job.findByIdAndDelete(id);

    if (!jobToDelete) {
        throw new ApiError(404, 'Job not found');
    }
    res.status(200).json({
        message: 'Job removed successfully',
        data: jobToDelete
    });
});


export {
    createJob, deleteJob, getJobByCompany, getJobById, getJobs
};
