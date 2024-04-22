import { v2 as cloudinary } from "cloudinary";

import fs from "fs";
import { ENV_VARS } from "../constant";

cloudinary.config({
  cloud_name: ENV_VARS.CLOUDINARY_CLOUD_NAME,
  api_key: ENV_VARS.CLOUDINARY_API_KEY,
  api_secret: ENV_VARS.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    //upload the file on cloudinary
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log("File is uploaded on cloudinary", res.url);
    fs.unlinkSync(localFilePath);
    return res;
  } catch (error) {
    console.log("error while upload to cloud", error);
    fs.unlinkSync(localFilePath); // remove the locally saved temp file as the upload operation got failed
    return null;
  }
};

export { uploadFileToCloudinary };
