import mongoose, { Schema } from "mongoose";
const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing
      ref: "USer"
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom is subscriber is subscribing
      ref: "USer"
    },

  },
  {
    timestamps: true,
  }
);


export const User = mongoose.model("Subscription", subscriptionSchema);
