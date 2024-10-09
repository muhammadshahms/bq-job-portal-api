// import { faker } from '@faker-js/faker';
// import { Job } from './models/job.model.js';
// import { Company } from './models/company.model.js';
// import { User } from './models/user.model.js';

// const generateJobData = () => {
//     return {
//         company: [faker.database.mongodbObjectId()], // Random company ObjectId
//         applicant: [faker.database.mongodbObjectId()], // Random applicant ObjectId
//         positions_available: faker.number.int({ min: 1, max: 10 }),
//         remaining_positions: faker.number.int({ min: 1, max: 10 }),
//         last_date: faker.date.future(),
//         currently_hiring: faker.datatype.boolean(),
//         job_type: {
//             location: faker.helpers.arrayElement(['remote', 'onsite', 'hybrid']),
//             employment_type: faker.helpers.arrayElement(['full_time', 'internship', 'part_time', 'contract']),
//         },
//         job_title: faker.person.jobTitle(),
//         gender_preference: faker.helpers.arrayElement(['male', 'female']),
//         no_of_employees: faker.number.int({ min: 10, max: 500 }),
//         hiring_manager: faker.datatype.boolean(),
//         documents_required: faker.datatype.boolean(),
//         company_mail: faker.internet.email(),
//         about: faker.lorem.paragraph(),
//         education: "Bachelor's Degree in Computer Science",
//         skills: [faker.person.jobType(), faker.person.jobType()],
//         good_to_have: faker.lorem.sentence(),
//         experience: `${faker.number.int({ min: 1, max: 10 })} years experience in ${faker.person.jobArea()}`,
//     };
// };

// const seedJobs = async () => {
//     for (let i = 0; i < 10; i++) {
//         await Job.create(generateJobData());
//     }
//     console.log("Job data seeded!");
// };
// seedJobs();




// const generateUserData = () => {
//     return {
//         avatar: {
//             public_id: faker.database.mongodbObjectId(),
//             url: faker.image.avatar(),
//         },
//         fullName: faker.person.fullName(),
//         banoQabilId: faker.datatype.uuid(),
//         email: faker.internet.email(),
//         phoneNumber: faker.phone.number(),
//         gender: faker.helpers.arrayElement(['male', 'female']),
//         nationality: faker.address.country(),
//         address: faker.address.streetAddress(),
//         preferredJob: faker.person.jobTitle(),
//         roll: faker.helpers.arrayElement(['user', 'password']),
//         workPreference: faker.helpers.arrayElement(['remote', 'onsite', 'hybrid']),
//         availability: faker.helpers.arrayElement(['full_time', 'internship', 'part_time', 'contract']),
//         education: "Bachelor's Degree in Computer Science",
//         resume: {
//             public_id: faker.database.mongodbObjectId(),
//             url: faker.internet.url(),
//         },
//         password: faker.internet.password(),
//     };
// };

// const seedUsers = async () => {
//     for (let i = 0; i < 10; i++) {
//         await User.create(generateUserData());
//     }
//     console.log("User data seeded!");
// };
// seedUsers();


// const generateCompanyData = () => {
//     return {
//         email: faker.internet.email(),
//         companyName: faker.company.name(),
//         avatar: {
//             public_id: faker.database.mongodbObjectId(),
//             url: faker.image.business(),
//         },
//         password: faker.internet.password(),
//         noOfEmployees: faker.number.int({ min: 10, max: 500 }),
//         otp: faker.random.numeric(6),
//         otpExpires: faker.date.future(),
//         isVerified: faker.datatype.boolean(),
//     };
// };

// const seedCompanies = async () => {
//     for (let i = 0; i < 10; i++) {
//         await Company.create(generateCompanyData());
//     }
//     console.log("Company data seeded!");
// };
// seedCompanies();
