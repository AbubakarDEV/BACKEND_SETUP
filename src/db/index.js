import mongoose from "mongoose";
import { ENV_VARS } from "../constant";

const DatabaseConnection = async () => {
  try {
    const connectionInstance = await mongoose.connect(ENV_VARS.MONGODB_URI);
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default DatabaseConnection;
