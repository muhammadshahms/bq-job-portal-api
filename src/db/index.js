import { connect } from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await connect(process.env.MONGODB_URI);
        console.log(`\n MongoDB Connected !! DB Host : ${connectionInstance.connection.host}`);

    } catch (error) {
        console.error("Error: ", error);
        process.exit(1);
    }
}

export default connectDB;