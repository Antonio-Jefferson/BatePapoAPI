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

const validationMessages = joi.object({
    to: joi.string().required(),
    text: joi.string().required().min(1),
    type: joi.string().valid("message", "private_message").required(),
    from: joi.string(),
    time: joi.string()
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
        const isValid = await db.collection("participants").findOne({ name });
        if (isValid) {
            res.status(409).send("Usuario já existente!")
            return;
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

server.get("/participants", async (req, res) => {
    try {
        const promise = await db.collection("participants").find().toArray();
        res.status(200).send(promise);
    } catch (error) {
        res.sendStatus(400)
    }
})

server.post("/messages", async (req, res)=>{
    const {to, text, type} = req.body;
    const {user} = req.headers;
    try {
        const messageUser = {
            to,
            text,
            type,
            from:user,
            time: day().format("hh:mm:ss")
        }
        const validateMessage = validationMessages.validate(messageUser);
        if(validateMessage.error){
            const errors = validateMessage.error.details.map(item => item.message);
            res.status(422).send(errors);
            return;
        }
        const isParticipant = await db.collection("participants").findOne({ name: user });
        if(!isParticipant){
            res.status(422).send("Usuario não existe");
            return;
        }
        await db.collection("messages").insertOne(messageUser);
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})
server.get("/messages", async (req, res)=>{
    
})


server.listen(process.env.PORT_SERV, () => console.log(`Running on the door ${process.env.PORT_SERV}`))
