import express, {json} from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());

const participants = [];
const messages = [{
    to: "Maria",
    text: "oi sumida rs",
    type: "private_message"
},
{
    to: "Todos",
    text: "olá",
    type: "message"
}];

app.post('/participants', (req, res) => {
    const {name} = req.body;
    participants.push(name);
    res.send(name); 
});

app.get('/participants', (req, res) => {
    res.send(participants);
});

app.post('/messages', (req, res) => {
    res.send(messages);
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