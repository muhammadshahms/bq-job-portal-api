import express from 'express';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from "./middlewares/error.middleware.js"

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes

import { userRoutes, companyRoutes, jobRoutes} from './routes/index.js'

app.use('/api/v1/user', userRoutes)
app.use('/api/v1/company', companyRoutes)
app.use('/api/v1/jobs', jobRoutes)

app.use(errorMiddleware)

export { app }