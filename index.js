import express, {json} from 'express';
import {MongoClient} from 'mongodb';
import dayjs from 'dayjs';
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
    console.log(chalk.blue.bold('Banco de dados conectado!'));
}).catch(e => {
    console.log(chalk.red.bold('Erro ao conectar banco de dados'));
});

app.post('/participants', async (req, res) => {
    const {name} = req.body;
    try {
        await db.collection('participants').insertOne({name: name, lastStatus: Date.now()});
        res.sendStatus(201); 
    } catch(e) {
        res.status(422).send('Não foi possível realizar o cadastro');
    }
});

app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection('participants').find({}).toArray();
        res.send(participants);
    } catch(e) {
        res.status(500).send('Erro ao obter participantes');
    }
});

app.post('/messages', async (req, res) => {
    const {to, text, type} = req.body;
    const {user} = req.headers;
    const time = dayjs(Date.now()).format('HH:mm:ss');
    const message = {
        from: user,
        to: to, 
        text: text, 
        type: type,
        time: time
    };
    try {
        await db.collection('messages').insertOne(message);
        res.sendStatus(201);
    } catch(e) {
        res.status(422).send('Não foi possível enviar a mensagem');
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await db.collection('messages').find({}).toArray();
        res.send(messages);
    } catch(e) {
        res.status(500).send('Erro ao obter mensagens');
    }
});

app.post('/status', async (req, res) => {
    const {user} = req.headers;
    const validate = await db.collection('participants').find({name: user}).toArray();
    if (validate.length === 0) {
        res.sendStatus(404);
    }
    else {
        validate[0].lastStatus = Date.now();
        res.sendStatus(200);
    }
});

app.listen(5000, () => {
    console.log(chalk.green.bold('Servidor no ar'));
});