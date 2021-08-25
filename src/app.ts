require('dotenv').config()

import express from 'express';
import http from 'http';
import WebSocket, { AddressInfo } from 'ws';

import db from './services/faunaDB';
import RoomManager from './services/RoomManager';


// express app
const app = express();

// web socket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const roomManager = new RoomManager();

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
        roomManager.addUser(roomId, ws);
        ws.send('Hi there, you rock!');
        ws.on('message', (msg: string) => {
            console.log(`received: ${msg}`);
            roomManager.getRoomUsers(roomId).forEach((client) => {
                if (client.readyState === 1) {
                    client.send(`Broadcasting: ${msg}`)
                }
            })
        });
        ws.on('close', () => {
            roomManager.removeUser(roomId, ws);
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



