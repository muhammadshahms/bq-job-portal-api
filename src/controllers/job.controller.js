import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from "../utils/asyncHandler.js";

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

    console.log('Request Body:', req.body);

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

    console.log('Company Name:', companyName);

    const companyData = await Job.find({ companyName }).lean(); 
    console.log('Company Data:', companyData); 
    if (!companyData) {
        return next(new ApiError(404, "Company not found"));
    }

    req.company = companyData;

    const newJob = await Job.create({
        companyName,
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

    return res.status(201).json(
        new ApiResponse(
            201,
            { job: newJob },
            "Job Created Successfully"
        )
    );
});
const saveDraftJob = asyncHandler(async (req, res, next) => {
    const { company,  positions_available, remaining_positions, last_date, currently_hiring, job_type, job_title, gender_preference, no_of_employees, hiring_manager, documents_required, company_mail, about, education, skills, good_to_have, experience } = req.body;

    const { id } = req.params;

    let job;
    if (id) {
        job = await Job.findById(id);
        if (!job) {
            return next(new ApiError(404, 'Draft not found'));
        }

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
        job.status = 'draft'; 

        await job.save();
    } else {
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
            status: 'draft', 
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
const getJobs = asyncHandler(async (req, res, next) => {

    const jobs = await Job.find()

    if ( !jobs.length) {
        return next(new ApiError(404, `No jobs found`));
    }

    if (!jobs) {
        return next(new ApiError(404, 'No job found'))
    };
    return res.status(200).json(
        new ApiResponse(200,{
            jobs: jobs
        },
        `Data fetched successfully`
    )
    );
});
const getJobById = asyncHandler(async (req, res, next) => {
    const { id } = req.body;


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
    const { companyName , skills } = req.body;
   

    const skillData = await Job.find({skills});
    const jobs = await Job.find({companyName});

    if (!jobs || jobs.length === 0 ||!skillData || skillData.length === 0) {
        throw new ApiError(404, 'No jobs found');
    }

    res.status(200).json({
        data: jobs,
        skills: skillData,
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
const skillsMatch = asyncHandler(async (req, res, next) => {

    const { skills } = req.body;

    if (!skills) {
        return res.status(400).json({ message: 'Skills query parameter is required' });
    }

    const skillArray = skills.split(',').map(skill => skill.trim());

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const matchingJobs = await Job.find({
        skills: { $in: skillArray }
    }).skip(skip).limit(limit);




    if (!matchingJobs.length) {
        return next(new ApiError(404, `No Job Match your Skills`));
    }
    const totalJobs = await Job.countDocuments();
    const totalJobsPages = Math.ceil(totalJobs / limit);
    return res.status(200).json(
        new ApiResponse(200, {
            matchingJobs: matchingJobs,
            userPagination: {
                totalCount: totalJobs,
                totalPages: totalJobsPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        }));
});


export {
    createJob, 
    deleteJob, 
    getJobByCompany, 
    getJobById, 
    skillsMatch, 
    getJobs,
    saveDraftJob,
    getDraftJobs,
};
