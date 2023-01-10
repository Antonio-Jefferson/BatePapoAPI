import express from "express";
import cors from "cors";
import dotenv from  "dotenv";
import { MongoClient }  from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();
const server = express();
server.use(cors())
server.use(express.json())

const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;
mongoClient.connect().then(()=> {
    db = mongoClient.db("bankbatepapouol")
})

server.listen(process.env.PORT_SERV, ()=> console.log(`Running on the door ${process.env.PORT_SERV}`))
