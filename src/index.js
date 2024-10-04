import dotenv from "dotenv";
import {app} from './app.js';
import connectDB from "./db/index.js"
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config({
    path: './.env'
});

const server = createServer(app);
const io = new Server(server);

const jobSeekersRoom = 'jobSeekersRoom';

io.on("connection", (socket) => {
    console.log("connected", socket.id);

    socket.on('NEW_MESSAGE', ({chatId, message}) => {

        const messageForRealTime = {
            content: message,
            _id: "ksjd093mc",
            chat: chatId,
        };

        socket.broadcast.emit('MESSAGE', messageForRealTime);
        console.log("New message", messageForRealTime);
 
    });

    socket.on('JOIN_JOB_SEEKERS', () => {
        socket.join(jobSeekersRoom);
        console.log(`User ${socket.id} joined the job seekers room`);
    });

    socket.on('NEW_JOB', ({ jobId, company, jobTitle }) => {
        const jobForRealTime = {
            _id: jobId,
            company,
            jobTitle,
        };

        // Notify only job seekers
        io.to(jobSeekersRoom).emit('NEW_JOB', jobForRealTime);
        console.log("New job posted", jobForRealTime);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
    });

})

connectDB()
.then(() => {
    server.listen(process.env.PORT || 8000, () => {

        console.log(`App listening on port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed !!! ", err);
})