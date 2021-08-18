require('dotenv').config()
const express = require('express');
const http = require('http');
const WebSocket = require('ws');


// express app
const app = express();

// fauna db
const faunadb = require('faunadb');
const q = faunadb.query;
const dbClient = new faunadb.Client({ domain: process.env.FAUNA_DOMAIN, secret: process.env.FAUNA_KEY });


// web socket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        console.log(`received: ${msg}`);
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(`Broadcasting: ${msg}`)
            }
        })
    });
    ws.send('Hi there, you rock!');
});


const db = {
    async read() {
        console.log('reading items');
        try {
            const items = (await dbClient.query(q.Map(q.Paginate(q.Documents(q.Collection('items'))), q.Lambda(x => q.Get(x))))).data;
            return items.map(item => ({ ...item.data, id: item.ref.id }));
        } catch (e) {
            return e.description;
        }
    },
    async add(item) {
        console.log('adding new item');
        try {
            const newItem = await dbClient.query(q.Create(q.Collection('items'), { data: item }));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description;
        }
    },
    async remove(id) { 
        console.log(`removing ${id}`);
        try {
            return dbClient.query(q.Delete(q.Ref(q.Collection('items'), id)));
        } catch (e) {
            return e.description;
        }
    },
    async edit({ id, ...rest }) {
        console.log(`editting item ${id}`);
        try {
            const newItem = await dbClient.query(q.Replace(q.Ref(q.Collection('items'), id), { data: rest }));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description
        }
    }
}


// routes
app.get('/', (req, res) => {
    res.send('Hello World!')
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${server.address().port}`);
});

