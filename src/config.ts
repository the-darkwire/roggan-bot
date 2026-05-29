import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const token = process.env.TOKEN;
export const clientID = process.env.CLIENT_ID;
export const dbPath = process.env.DB_PATH ?? "./roggan.db";
export const prefix = "!";
