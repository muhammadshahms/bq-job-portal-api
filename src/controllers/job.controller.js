import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from "../utils/asyncHandler.js";
// import { seedJobs } from '../../seeder.js';

const createJob = asyncHandler(async (req, res, next) => {
    const {  
        companyName,
        applicant,
        positions_available,
        remaining_positions,
        last_date,
        currently_hiring,
        job_type,
        job_title,
        gender_preference,
        no_of_employees,
        hiring_manager,
        documents_required,
        company_mail,
        about,
        education,
        skills,
        good_to_have,
        experience
    } = req.body;

    // Log the request body and check if companyName is provided
    console.log('Request Body:', req.body);

    // Validate required fields properly
    if (
        !companyName,
        !positions_available,
        !remaining_positions,
        !last_date,
        !currently_hiring,
        !job_type,
        !job_title,
        !gender_preference,
        !no_of_employees,
        !hiring_manager,
        !documents_required,
        !company_mail,
        !about,
        !education,
        !skills,
        !good_to_have,
        !experience
    ) {
        return next(new ApiError(400, "All fields are required"));
    }

    // Log the companyName to see if it's being correctly received
    console.log('Company Name:', companyName);

    // Check if the company exists in the database
    const companyData = await Job.find({ companyName }).lean(); // Use .lean() to return plain JSON objects
    console.log('Company Data:', companyData); // Log the company data

    // If company is not found, return a 404 error
    if (!companyData) {
        return next(new ApiError(404, "Company not found"));
    }

    // Manually set req.company for further use if necessary
    req.company = companyData;

    // Create a new job entry in the database
    const newJob = await Job.create({
        companyName, // Using companyName from request body
        // applicant, 
        positions_available, 
        remaining_positions, 
        last_date, 
        currently_hiring, 
        job_type, 
        job_title, 
        gender_preference, 
        no_of_employees, 
        hiring_manager, 
        documents_required, 
        company_mail, 
        about, 
        education, 
        skills, 
        good_to_have, 
        experience
    });

    // Return a response with the created job
    return res.status(201).json(
        new ApiResponse(
            201,
            { job: newJob }, // Include only the job data, not the entire companyData
            "Job Created Successfully"
        )
    );
});


const saveDraftJob = asyncHandler(async (req, res, next) => {
    const { company,  positions_available, remaining_positions, last_date, currently_hiring, job_type, job_title, gender_preference, no_of_employees, hiring_manager, documents_required, company_mail, about, education, skills, good_to_have, experience } = req.body;

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
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 20;

    // // Calculate the number of items to skip
    // const skip = (page - 1) * limit;

    // Fetch company and job data with pagination
    const jobs = await Job.find()
    // .skip(skip).limit(limit);

    // Check if either companys or jobs is not found
    if ( !jobs.length) {
        return next(new ApiError(404, `No jobs found`));
    }

    // Get total counts for companies and jobs
    // const totalJobs = await Job.countDocuments();

    // Calculate total pages
    // const totalJobPages = Math.ceil(totalJobs / limit);
    // const seedData = await seedJobs();
    if (!jobs) {
        return next(new ApiError(404, 'No job found'))
    }
    
    return res.status(200).json(
        new ApiResponse(200,{
            jobs: jobs
            // jobPagination: {
            //     totalCount: totalJobs,
            //     totalPages: totalJobPages,
            //     currentPage: page,
            //     itemsPerPage: limit,
            // },
        },
        `Data fetched successfully`
    )
    );
});

const getJobById = asyncHandler(async (req, res, next) => {
    const { id } = req.body;
    // const dataId = await seedJobs();


    if (!id) {
        throw new ApiError(400, 'Job Id is required');
    }

    const jobs = await Job.findById(id);

   
    if ( !jobs ||jobs.length === 0) {
        return (404, 'No jobs found');
    }

    res.status(200).json({
        data: jobs,
        message: 'Jobs found successfully'
    });
});
const getJobByCompany = asyncHandler(async (req, res, next) => {
    const { companyName } = req.body;
    // const dataId = await seedJobs();


    // if (!id) {
    //     throw new ApiError(400, 'Job Id is required');
    // }

    const jobs = await Job.find({companyName});

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
