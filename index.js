import express, {json} from 'express';
import {MongoClient, ObjectId} from 'mongodb';
import dotenv from 'dotenv';
import chalk from 'chalk';
import dayjs from 'dayjs';
import cors from 'cors';
import joi from 'joi';

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
});
promise.catch(e => {
    console.log(chalk.red.bold('Erro ao conectar banco de dados'));
});

const messageSchema = joi.object({
    from: joi.string(),
    to: joi.string().required(),
    text: joi.string().min(2).required(),
    type: joi.string().valid('message', 'private_message'),
    time: joi.string()
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
    const userSchema = joi.object({
        name: joi.string().min(3).required()
    });
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
        const validation = userSchema.validate({name});
        const participants = await db.collection('participants').find({}).toArray();
        const isEqual = participants.some(participant => participant.name === name);
    
        if (validation.error) {
            res.status(422).send(validation.error.details[0].message);
            return;
        }
        if (isEqual) {
            res.status(409).send('Usuário já cadastrado');
            return;
        }
    
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
    const {user} = req.headers;
    const {to, text, type} = req.body;
    const time = dayjs(Date.now()).format('HH:mm:ss');
    const message = {
        from: user,
        to: to, 
        text: text, 
        type: type,
        time: time
    };

    try {
        const participant = await db.collection('participants').findOne({name: user});
        const validation = messageSchema.validate(message);

        if (!participant) {
            res.status(422).send('Faça login novamente');
            return;
        } 
        if (validation.error) {
            res.status(422).send(validation.error.details[0].message);
            return;
        }

        await db.collection('messages').insertOne(message);
        res.sendStatus(201);
    } catch(e) {
        res.status(422).send('Não foi possível enviar a mensagem');
    }
});

app.get('/messages', async (req, res) => {
    const {user} = req.headers;
    const {limit} = req.query;

    try {
        const messages = await db.collection('messages').find({$or: [{to: 'Todos'}, {to: user}, {from: user}]}).toArray();
       
        if (!limit) {
            res.send(messages);
            return;
        } 

        const messagesLimited = messages.reverse().splice(0,limit);
        res.send(messagesLimited.reverse());
    } catch(e) {
        res.status(500).send('Erro ao obter mensagens');
    }
});

app.delete('/messages/:id', async (req, res) => {
    const {user} = req.headers;
    const {id} = req.params;
    
    try {
        const message = await db.collection('messages').find({_id: new ObjectId(id)}).toArray();

        if (!message) {
            res.sendStatus(404);
            return;
        }
        if (message[0].from !== user) {
            res.sendStatus(401);
            return;
        }

        await db.collection('messages').deleteOne({_id: new ObjectId(id)});
        res.sendStatus(200);
    } catch(e) {
        res.status(500).send(error);
    }
});

app.put('/messages/:id', async (req, res) => {
    const {id} = req.params;
    const {user} = req.headers;
    const {to, text, type} = req.body;
    const time = dayjs(Date.now()).format('HH:mm:ss'); 
    const newMessage = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: time
    };
    const validation = messageSchema.validate(newMessage);

    try {
        const message = await db.collection('messages').find({_id: new ObjectId(id)}).toArray();
        const participant = await db.collection('participants').findOne({name: user});

        if (!message) {
            res.sendStatus(404);
            return;
        }
        if (message[0].from !== user) {
            res.sendStatus(401);
            return;
        }
        if (!participant) {
            res.status(422).send('Faça login novamente');
            return;
        }
        if (validation.error) {
            res.status(422).send(validation.error.details[0].message);
            return;
        }

        await db.collection('messages').updateOne({_id: new ObjectId(id)}, {$set: newMessage});
        res.sendStatus(200);
    } catch(e) {
        res.status(500).send(error);
    }
});

app.post('/status', async (req, res) => {
    const {user} = req.headers;

    try {
        const participant = await db.collection('participants').findOne({name: user});
        
        if (!participant) {
            res.sendStatus(404);
            return;
        }

        await db.collection('participants').updateOne({name: user}, {$set: {"lastStatus": Date.now()}});
        res.sendStatus(200);
    } catch(e) {
        res.status(500).send(error);
    }
});

app.listen(5000, () => {
    console.log(chalk.green.bold('Servidor no ar'));
});