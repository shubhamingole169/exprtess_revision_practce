import { v2 as cloudinary } from "cloudinary";
import fs from "fs"


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfully
        console.log("file is uploeded on cloudinary successfully !!!", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally temporary saved filed when operation got failed
        return null;
    }
}

export { uploadOnCloudinary }