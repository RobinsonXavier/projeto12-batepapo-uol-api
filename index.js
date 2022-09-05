import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);

let db;

mongoClient.connect(()=> {
    db = mongoClient.db('batepapouol')
});

const timeNow = dayjs().format('HH:mm:ss');

const participantsSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private-message').required()
});


app.get("/participants", async (req, res) => {

    try {
        const participants = await db.collection('participants').find().toArray();
        res.send(participants)
    } catch (error) {
        console.log(error.message);
        res.sendStatus(500);
    }
});

app.get("/messages", async (req, res) => {

        const limit = parseInt(req.query.limit);

        if (limit) {

            try {
                const messages = await db.collection("messages").find().toArray();
                res.send(messages.slice(-limit));
            } catch (error) {
                console.log(error.message);
                res.sendStatus(500);
            }
            return;
        }

        try {

            const messages = await db.collection("messages").find().toArray();
            res.send(messages);
        } catch (error) {
            console.log(error.message);
            res.sendStatus(500);
        }
});

app.post("/participants", async (req, res) => {

    const {name} = req.body; //strings não vazio
    const lastStatus = Date.now();

    const validation = participantsSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        res.status(422).send(errors);
        return;
    }
    
    try {
        const response = await db.collection('participants').insertOne({name, lastStatus});
        const response2 = await db.collection('messages').insertOne({from: name, to: "Todos", text: "entra na sala...", type: "status", time: timeNow})
        res.sendStatus(201);
        console.log(response2)
    } catch (error) {
        console.log(error.message);
        res.sendStatus(422);
    }
});

app.post("/messages", async (req, res) => {

    const {to, text, type} = req.body; 
    const user = req.headers.user;

    const validation = messageSchema.validate(req.body, {abortEarly: false});

    if (validation.error) {
        const errors = validation.error.details.map( detail => detail.message);
        res.status(422).send(errors);
        return;
    }

    try {
        const response = await db.collection('messages').insertOne(
            {
                from: user,
                to,
                text,
                type,
                time : timeNow
            });
        res.sendStatus(201);
    } catch (error) {
        console.log(error.message);
        res.sendStatus(422);
    }
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;

    const updatedUser = {
        name: user,
        lastStatus: Date.now()
    };

    try {
        const participants = await db.collection('participants').find().toArray();
        const validUser = participants.find(valid => valid.name === user);
        if (!validUser) {
            res.sendStatus(404);
            return;
        }
        const update = await db.collection('participants').updateOne({_id: ObjectId(validUser._id)}, {$set: updatedUser});
        res.sendStatus(200);
    } catch (error) {
        console.log(error.message);
        res.sendStatus(500);
    }

});

setInterval(app.delete('/participants', async (req, res) => {
    try {
        const users = await db.collection('participants').find().toArray();
        const dUsers = users.filter(user => {
           Date.now() - user.lastStatus > 10
        });
        for (let i = 0; i < dUsers.length; i++) {
            await db.collection('participants').deleteOne({_id: new ObjectId(dUsers[0]._id)});      
        }

    } catch (error) {
        console.log(error.message);
        res.sendStatus(500);
    }
}))

app.listen(5000, () => {
    console.log('Server on');
});