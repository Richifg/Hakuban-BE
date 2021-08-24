require('dotenv').config()

import express from 'express';
import http from 'http';
import WebSocket, { AddressInfo } from 'ws';

import db from './services/faunaDB';


// express app
const app = express();

// web socket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket, req) => {
    ws.on('message', (msg: string) => {
        console.log(`received: ${msg}`);
        wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === 1) {
                client.send(`Broadcasting: ${msg}`)
            }
        })
    });
    ws.send('Hi there, you rock!');
});


// routes
app.get('/', (req, res) => {
    res.send('Hello World!')
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});



