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
const saveDraftJob = asyncHandler(async (req, res, next) => {
    const { company, applicant, positions_available, remaining_positions, last_date, currently_hiring, job_type, job_title, gender_preference, no_of_employees, hiring_manager, documents_required, company_mail, about, education, skills, good_to_have, experience } = req.body;

    // If updating an existing draft, look for its ID
    const { id } = req.params;

    let job;
    if (id) {
        // Update existing draft
        job = await Job.findById(id);
        if (!job) {
            return next(new ApiError(404, 'Draft not found'));
        }

        // Update job fields
        job.company = company || job.company;
        job.job_title = job_title || job.job_title;
        job.positions_available = positions_available || job.positions_available;
        job.remaining_positions = remaining_positions || job.remaining_positions;
        job.last_date = last_date || job.last_date;
        job.currently_hiring = currently_hiring || job.currently_hiring;
        job.job_type = job_type || job.job_type;
        job.gender_preference = gender_preference || job.gender_preference;
        job.no_of_employees = no_of_employees || job.no_of_employees;
        job.hiring_manager = hiring_manager || job.hiring_manager;
        job.documents_required = documents_required || job.documents_required;
        job.company_mail = company_mail || job.company_mail;
        job.about = about || job.about;
        job.education = education || job.education;
        job.skills = skills || job.skills;
        job.good_to_have = good_to_have || job.good_to_have;
        job.experience = experience || job.experience;
        job.status = 'draft'; // Ensure status is set to draft

        await job.save();
    } else {
        // Create new draft
        job = new Job({
            company,
            job_title,
            positions_available,
            remaining_positions,
            last_date,
            currently_hiring,
            job_type,
            gender_preference,
            no_of_employees,
            hiring_manager,
            documents_required,
            company_mail,
            about,
            education,
            skills,
            good_to_have,
            experience,
            status: 'draft',  // Default to draft status
        });

        await job.save();
    }

    return res.status(201).json(
        new ApiResponse(201, "Draft saved successfully", job)
    );
});


const getDraftJobs = asyncHandler(async (req, res, next) => {
    const drafts = await Job.find({ status: 'draft' });

    if (drafts.length === 0) {
        return next(new ApiError(404, 'No draft jobs found'));
    }

    return res.status(200).json(
        new ApiResponse(200, drafts, 'Drafts fetched successfully')
    );
});



// Add route to publish a job

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
    const { id } = req.body.id;
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
    createJob, 
    deleteJob, 
    getJobByCompany, 
    getJobById, 
    getJobs,
    saveDraftJob,
    getDraftJobs,
     // Add route to publish a job
};
