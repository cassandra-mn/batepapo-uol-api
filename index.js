import express, {json} from 'express';
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';
import chalk from 'chalk';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db('batepapo');
    console.log(chalk.blue.bold('Banco de dados conectado'));
});

const participants = [];
const messages = [];

app.post('/participants', async (req, res) => {
    const {name} = req.body;
    try {
        const participant = await db.collection('participants').insertOne({name: name, lastStatus: Date.now()});
        res.sendStatus(201); 
        mongoClient.close();
    } catch(e) {
        res.sendStatus(422);
        mongoClient.close();
    }
});

app.get('/participants', (req, res) => {
    res.send(participants);
});

app.post('/messages', (req, res) => {
    const {to, text, type} = req.body;
    const message = {
        to: to, 
        text: text, 
        type: type
    };
    messages.push(message);
    res.sendStatus(201);
});

app.get('/messages', (req, res) => {
    res.send(messages);
});

app.post('/status', (req, res) => {
    res.send('Status');
});

app.listen(5000, () => {
    console.log(chalk.green.bold('Servidor no ar'));
});