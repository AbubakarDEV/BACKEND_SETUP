import { ENV_VARS } from "../constant";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadFileToCloudinary } from "../utils/cloudinary";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // get user detail from frontend
  const { username, email, fullname, password } = req.body;

  // validation - not empty
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are Required");
  }

  // check if user already exists: username,email
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path || "";
  // const coverImageLocalPath = req.files?.coverImage[0]?.path || "";
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Local Avatar is required");
  }

  // upload to cloudinary, avatar
  const avatar = await uploadFileToCloudinary(avatarLocalPath);
  const coverImg = await uploadFileToCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Cloudinary Avatar is required");
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

const loginUser = asyncHandler(async (req, res) => {

  // get data from req.body
  const { email, password, username } = req.body

  // username or email
  if (!email && !username) {
    throw new ApiError(400, "username or email is required")
  }

  // find the user
  const userDB = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (!userDB) {
    throw new ApiError(400, "user does not exist")
  }

  // password check
  const isPasswordValid = await userDB.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid user credentials")
  }

  // access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(userDB._id)
  const loggedInUser = await User.findById(userDB._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true
  }

  // send cookie
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged In Successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  // reset refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  // clear cookies
  const options = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {
        },
        "User logged out Successfully"
      )
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomongRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomongRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }
  try {
    const decodedToken = jwt.verify(
      incomongRefreshToken,
      ENV_VARS.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomongRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used")
    }
    const options = {
      httpOnly: true,
      secure: true
    }
    const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken, refreshToken: newRefreshToken
          },
          "Access Token refreshed Successfully"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {
    oldPassword, newPassword
  } = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false })
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
        },
        "Password changed Successfully"
      )
    )

})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: req.user
        },
        "Current User fetched Successfully"
      )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {
    username, email, fullname,
  } = req.body

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
        username: username
      }
    },
    {
      new: true
    }
  ).select(
    "-password -refreshToken"
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: user
        },
        "User updated Successfully"
      )
    )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file are required")
  }
  const avatar = await uploadFileToCloudinary(avatarLocalPath)
  if (!avatar.url) {
    throw new ApiError(400, "error while uploading avatar on cloudinary")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {
      new: true
    }
  ).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: user
        },
        "Avatar updated Successfully"
      )
    )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file are required")
  }
  const coverImage = await uploadFileToCloudinary(coverImageLocalPath)
  if (!coverImage.url) {
    throw new ApiError(400, "error while uploading coverImage on cloudinary")
  }

  await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {
      new: true
    }
  ).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: user
        },
        "coverImage updated Successfully"
      )
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "username does not exist")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
              then: true,
              else: false
            }
          }
        }
      }
    },
    {
      $project: {
        fullname: 1,
        email: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1
      }
    }
  ])
  if (!channel?.length) {
    throw new ApiError(400, "channel does not exist")
  }


  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          channel: channel[0]
        },
        "User channel fetched Successfully"
      )
    )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
};
