import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
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
    
    try {
        const response = await db.collection('participants').insertOne({name, lastStatus});
        res.sendStatus(201);
    } catch (error) {
        console.log(error.message);
        res.sendStatus(422);
    }
});

app.post("/messages", async (req, res) => {

    const {to, text, type} = req.body; //string não vazias, type só pode ser ´message'ou 'private-message'
    const {User} = req.header;


    try {
        const response = await db.collection('messages').insertOne(
            {
                from: User,
                to,
                text,
                type
            });
        res.sendStatus(201);
    } catch (error) {
        console.log(error.message);
        res.sendStatus(422);
    }
});

app.listen(5000, () => {
    console.log('Server on');
});