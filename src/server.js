import express from "express";
import cors from "cors";
import dotenv from  "dotenv";

dotenv.config();
server.use(cors())
server.use(express.json())

const server = express();


server.listen(process.env.PORT_SEV, ()=> console.log(`Running on the door ${process.env.PORT_SERV}`))
