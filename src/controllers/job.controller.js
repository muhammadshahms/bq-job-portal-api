import { asyncHandler } from "../utils/asyncHandler.js";


const createJob = asyncHandler(async (req, res, next) => {

    const {
        companyName,
        no_of_employees,
        hiring_manager,
        job_title,

    } = req.body;

})

export { createJob }