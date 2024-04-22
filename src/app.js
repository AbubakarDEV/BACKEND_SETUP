import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: ENV_VARS.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(express.static("public"));

app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes";
import { ENV_VARS } from "./constant";

// routes declaration
app.use("/api/v1/users", userRouter);
export { app };
