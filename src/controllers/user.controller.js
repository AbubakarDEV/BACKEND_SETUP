import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadFileToCloudinary } from "../utils/cloudinary";

const registerUser = asyncHandler(async (req, res) => {
  // get user detail from frontend
  const { username, email, fullname, password } = req.body;
  console.log(username, email, fullname, password);

  // validation - not empty
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are Required");
  }

  // check is user already exists: username,email
  const existedUser = User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload to cloudinary, avatar
  const avatar = await uploadFileToCloudinary(avatarLocalPath);
  const coverImg = await uploadFileToCloudinary(coverImageLocalPath);

  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response
});

export { registerUser };
