import express, {json} from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());

const participants = [];
const messages = [];

app.post('/participants', (req, res) => {
    const {name} = req.body;
    participants.push(name);
    res.status(201); 
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
    res.status(201);
});

app.get('/messages', (req, res) => {
    res.send(messages);
});

app.post('/status', (req, res) => {
    res.send('Status');
});

app.listen(5000, () => {
    console.log('No ar');
});