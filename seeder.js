import { faker } from '@faker-js/faker'; // Correct import from faker
import { Job } from './src/models/job.model.js';

// import mongoose from'mongoose'; // Correct import from mongoose

// Seed function
const seedJobs = async () => {
    const jobsArray = [];

    // Generate 50 fake jobs
    for (let i = 0; i < 50; i++) {

        const job = await {
            company: faker.database.mongodbObjectId(),
            positions_available: faker.number.int({min: 1, max: 10}),
            remaining_positions: faker.number.int({ min: 1, max: 10 }),
            last_date: faker.date.future(),
            currently_hiring: faker.datatype.boolean(),
            job_type: faker.person.jobType(),
            job_title: faker.person.jobTitle(),
            gender_preference: faker.datatype.boolean() ? "male" : "female",
            no_of_employees: faker.number.int({ min: 10, max: 1000 }),
            hiring_manager: faker.datatype.boolean(),
            documents_required: faker.datatype.boolean(),
            company_mail: faker.internet.email(),
            about: faker.lorem.paragraphs(2),
            education: "Bachelor's Degree in Computer Science",
            skills: [faker.person.jobTitle(), faker.person.jobTitle()],
            good_to_have: faker.lorem.paragraphs(2),
            experience: faker.company.catchPhrase(),
        }

        jobsArray.push(job);
        Job.create(job)
    }


    // Return the generated jobs instead of inserting them
    return jobsArray;
};

seedJobs()

export { seedJobs };