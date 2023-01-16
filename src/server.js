import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId} from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();
const server = express();
server.use(cors())
server.use(express.json())
const PORT = 5000

const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;
mongoClient.connect().then(() => {
    db = mongoClient.db()
})

const validationName = joi.object({
    name: joi.string().required().min(3)
})

const validationMessages = joi.object({
    to: joi.string().required(),
    text: joi.string().required().min(1),
    type: joi.string().valid("message", "private_message").required(),
    from: joi.string().required(),
    time: joi.string()
})

server.post("/participants", async (req, res) => {
    try {
        const { name } = req.body;
        const validation = validationName.validate(req.body);
    
        if (validation.error) {
            const error = validation.error.details[0].message;
            res.sendStatus(422);
            return;
        }
        const isValid = await db.collection("participants").findOne({ name: name });
        if (isValid) {
            res.sendStatus(409)
            return;
        }
        const user =
        {
            name: name,
            lastStatus: Date.now()
        }
        await db.collection("participants").insertOne(user);

        const message = {
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format('HH:mm:ss')
        }
        await db.collection("messages").insertOne(message)
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500);
    }
})

server.get("/participants", async (req, res) => {
    try {
        const promise = await db.collection("participants").find().toArray();
        if (!promise) {
            res.status(404).send("Nenhum participante foi encontrado!");
            return;
          }
        res.send(promise);
    } catch (error) {
        res.sendStatus(500)
    }
})

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;
    try {
        const messageUser = {
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        }

        const validateMessage = validationMessages.validate(messageUser);
        if (validateMessage.error) {
            const errors = validateMessage.error.details.map(item => item.message);
            res.status(422).send(errors);
            return;
        }

        const isParticipant = await db.collection("participants").findOne({ name: user });
        if (!isParticipant) {
            res.status(422).send("Usuario não existe");
            return;
        }

        await db.collection("messages").insertOne(messageUser);
        res.sendStatus(201)

    } catch (error) {
        res.sendStatus(500)
    }
})
server.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    if (limit !== null && (limit <= 0 || isNaN(limit)) ) return res.sendStatus(422);

    try {
        const data = await db.collection("messages").find().toArray();
        const messagesFromUser = data.filter((intem) => intem.from === user || intem.to === user || intem.to === "Todos" || intem.type === "message")

        if (!limit) return res.send(messagesFromUser);

        if (limit && limit !== NaN) return res.send(messagesFromUser.reverse().slice(limit));
          
    } catch (error) {
        res.sendStatus(500)
    }
})

server.post("/status", async (req, res) => {
    const { user } = req.headers;
    try {
        const isParticipant = await db.collection("participants").findOne({ name: user });
        if (!isParticipant) {
            res.sendStatus(404)
            return;
        }
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500)
    }
})

setInterval(async () => {
    const seconds = Date.now() - 10 * 1000; 
    
    try {
      const inactiveUsers = await db
        .collection("participants").find({ lastStatus: { $lte: seconds } }).toArray();
  
      if (inactiveUsers.length > 0) {
        const inativeMessages = inactiveUsers.map((inactive) => {
            return {
              from: inactive.name,
              to: "Todos",
              text: "sai da sala...",
              type: "status",
              time: dayjs().format("HH:mm:ss"),
            };
          }
        );
        await db.collection("messages").insertMany(inativeMessages);
        await db.collection("participants").deleteMany({ lastStatus: { $lte: seconds } });
      }
    } catch (error) {
      console.log(error);
    }
  }, 10000);

  server.delete('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const {user} = req.headers;
  
    try {
      const thereIsMessage = await db.collection("messages").findOne({ _id: new ObjectId(id) })
      if (!thereIsMessage) {
        return res.sendStatus(404);
      }
  
      if (thereIsMessage.from !== user) {
        return res.sendStatus(401);
      }
  
      await db.collection("messages").deleteOne({
        _id: thereIsMessage._id
      });
      res.sendStatus(200);
    } catch (error) {
      res.sendStatus(500);
    }
  });
  
  server.put('/messages/:id', async (req, res) => {
    const message = req.body;
    const {id} = req.params;
    const {user}= req.headers;
  
    const validation = validationMessages.validate(message);
    if (validation.error) {
      return res.sendStatus(422);
    }
  
    try {
      const thereIsUser = await db.collection("participants").findOne({ name: user })

      if (! thereIsUser) return res.sendStatus(422)

      const thereIsMessages = await db.collection("messages").findOne({ _id: new ObjectId(id) });

      if (!thereIsMessages) return res.sendStatus(404)

      if (thereIsMessages.from !== user) return res.sendStatus(401)

      await db.collection("messages").updateOne({_id: new ObjectId(id)},{$set: message});
      res.sendStatus(201);
    } catch (error) {
      res.sendStatus(500);
    }
  });

server.listen(PORT, () => console.log(`Running on the door ${PORT}`))
