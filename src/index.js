import dotenv from "dotenv";
import {app} from './app.js';
import connectDB from "./db/index.js"

dotenv.config({
    path: './.env'
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App listening on port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed !!! ", err);
})