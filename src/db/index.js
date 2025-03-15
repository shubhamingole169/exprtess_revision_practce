import mongoose from "mongoose"
import { DB_NAME } from './../constants.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        // console.log("---------------starting------------------------------------")
        // console.log(connectionInstance)
        // // console.log(connectionInstance.connection)
        // console.log("-----------------------------ending----------------------")
        console.log(`/n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGO DB Connection error", error);
        process.exit(1)
    }
}


export default connectDB