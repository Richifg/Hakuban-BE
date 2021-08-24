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

const activeRooms: { [key: string]: WebSocket[] } = {};

wss.on('connection', async (ws: WebSocket, req) => {
    const urlParams = new URLSearchParams(req.url?.split('/')[1]);
    const roomId = urlParams.get('roomId');

    if (!roomId) {
        ws.send('Room not specified');
        ws.terminate();
    } else if (!await db.doesRoomExist(roomId)) {
        ws.send(`Room ${roomId} does not exist`);
        ws.terminate();
    } else {
        if (!activeRooms[roomId]) activeRooms[roomId] = [ws];
        else activeRooms[roomId].push(ws);

        ws.send('Hi there, you rock!');
        ws.on('message', (msg: string) => {
            console.log(`received: ${msg}`);
            activeRooms[roomId].forEach((client) => {
                if (client.readyState === 1) {
                    client.send(`Broadcasting: ${msg}`)
                }
            })
        });
        ws.on('close', () => {
            // add code here to remove ws from activeRooms
        })

    }
});


// routes
app.get('/', (req, res) => {
    res.send('Hello World!')
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});



