import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload file/image on cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      allowed_formats: ["jpg", "png", "pdf"],
    });

    // console.log(`File is uploaded on cloudinary: ${uploadResult.url}`);
    fs.unlinkSync(localFilePath); // Remove the file if uploaded on cloud or not
    return uploadResult;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally save temporary file as the upload operation got failed
    throw new Error(
      "This file format is not supported. Please upload a JPEG, PNG, or PDF file."
    );
  }
};

const deleteOnCloudinary = async (public_id, resource_type = "raw") => {
  try {
    if (!public_id) return null;

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: `${resource_type}`,
    });

    return result;

  } catch (error) {
    return error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
