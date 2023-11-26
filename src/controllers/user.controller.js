import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
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
  if (avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImg?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // check for user creation
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
  // return response
});

export { registerUser };
