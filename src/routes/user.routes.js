import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

userRouter.route("/login").post(
  loginUser
);

// secured routes
userRouter.route("/logout").post(
  verifyJWT,
  logoutUser
);
userRouter.route("/refresh-token").post(
  refreshAccessToken
);

userRouter.route("/update-password").post(
  changeCurrentPassword
);

userRouter.route("/current-user").get(
  getCurrentUser
);

userRouter.route("/update-user").post(
  updateAccountDetails
);

userRouter.route("/update-avatar").post(
  updateUserAvatar
);

userRouter.route("/update-coverimage").post(
  updateUserCoverImage
);


userRouter.route("/user-channel-profile").post(
  getUserChannelProfile
);

export default userRouter;
