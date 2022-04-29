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

setInterval(async () => {
    const participants = await db.collection('participants').find({}).toArray();
    const time = Date.now();
    const validate = participants.find(participant => {
        if (time - participant.lastStatus > 10000) return participant;
    });
    if (validate !== undefined) {
        const message = {
            from: validate.name,
            to: 'Todos',
            text: 'sai da sala...', 
            type: 'status',
            time: dayjs(time).format('HH:mm:ss')
        };
        await db.collection('participants').deleteOne(validate);
        await db.collection('messages').insertOne(message);
    }
}, 15000);

app.post('/participants', async (req, res) => {
    const {name} = req.body;
    const period = Date.now();
    const time = dayjs(period).format('HH:mm:ss');
    const participant = {
        name: name, 
        lastStatus: period
    };
    const message = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...', 
        type: 'status',
        time: time
    };
    try {
        await db.collection('participants').insertOne(participant);
        await db.collection('messages').insertOne(message);
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
    const participant = await db.collection('participants').findOne({name: user});
    if (!participant) {
        res.sendStatus(404);
        return;
    }   
    await db.collection('participants').updateOne({name: user}, {$set: {"lastStatus": Date.now()}});
    res.sendStatus(200);
});

app.listen(5000, () => {
    console.log(chalk.green.bold('Servidor no ar'));
});