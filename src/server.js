import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import day from "dayjs";

dotenv.config();
const server = express();
server.use(cors())
server.use(express.json())

const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;
mongoClient.connect().then(() => {
    db = mongoClient.db("bankbatepapouol")
})

const validationName = joi.object({
    name: joi.string().required().min(3)
})

server.post("/participants", async (req, res) => {
    const { name } = req.body;
    const validation = validationName.validate(req.body);

    if (validation.error) {
        const error = validation.error.details[0].message;
        res.status(422).send(error);
        return;
    }

    try {
        const isValid = await db.collection("participants").findOne({ name: name });
        if (isValid) {
            res.status(409).send("Usuario já existente!")
        }
        const user =
        {
            name: name,
            lastStatus: Date.now()
        }
        await db.collection("participants").insertOne(user);

        const message = {
            from: "xxx",
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: "HH:MM:SS"
        }
        await db.collection("messages").insertOne(message)
        
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(400);
    }
})

server.listen(process.env.PORT_SERV, () => console.log(`Running on the door ${process.env.PORT_SERV}`))
