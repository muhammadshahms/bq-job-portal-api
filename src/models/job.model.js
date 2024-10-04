import { Schema, model, mongoose } from 'mongoose'

const jobSchema = new mongoose.Schema({
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    company: [
        {
            type: Schema.Types.String,
            ref: "Company"
        }
    ],
 
    applicant: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    positions_available: {
        type: Number,
        // required: true
    },
    remaining_positions: {
        type: Number,
        // required: true
    },
    last_date: {
        type: Date,
        // required: true
    },
    currently_hiring: {
        type: Boolean,
        // required: true
    },
    job_type: {
        location: {
            type: String,
            enum: ['remote', 'on-site', 'hybrid'],
            //   required: true,
        },
        employment_type: {
            type: String,
            enum: ['full_time', 'internship', 'part_time', 'contract'],
            //   required: true,
        }
    },
    job_title: {
        type: String,
        // required: true
    },
    gender_preference: {
        type: String,
        enum: ['male', 'female'],
        // required: true
    },
    no_of_employees: {
        type: Number,
        // required: true
    },
    hiring_manager: {
        type: Boolean,
        default: false,
    },
    documents_required: {
        type: String,
        default: true,
    },
    company_mail: { // email address for receiving updates
        type: String,
        // required: true
    },
    about: {
        type: String,
        // required: true
    },
    education: {
        type: String,
        // required: true
    },
    skills:
        [
            {
                type: Array,
                // required: true
            }
        ],
    good_to_have: {
        type: String,
        // required: true
    },
    experience: {
        type: String,
        // required: true
    },
}, { timestamps: true });

export const Job = mongoose.model("Job", jobSchema);
