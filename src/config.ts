import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const token = process.env.TOKEN;
export const clientID = process.env.CLIENT_ID;
export const prefix = "!";
