import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorMiddleware } from "./middlewares/error.middleware.js"

const app = express();
app.use(cors());

const corsOptions = {
    origin: 'https://your-frontend-domain.com', // Replace with your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true, // Allow credentials (cookies, authorization headers)
  };
  

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());


import { userRoutes, companyRoutes, jobRoutes} from './routes/index.js'

app.use('/api/v1/user', userRoutes)
app.use('/api/v1/company', companyRoutes)
app.use('/api/v1/jobs', jobRoutes)

app.use(errorMiddleware)

export { app }