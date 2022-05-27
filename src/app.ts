import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { AddressInfo } from 'ws';

import db from './services/faunaDB';
import RoomManager from './services/RoomManager';
import WebSocketManager from './services/WebSocketManager';

// express app
const app = express();

app.use(function (_, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

// initialize services
const server = http.createServer(app);
const roomManager = new RoomManager();
const webSocketManager = new WebSocketManager(server, roomManager, db);
webSocketManager.start();

// routes
app.get('/wakeup', (_, res) => {
    res.send('OK');
});

app.post('/room', async (req, res) => {
    if (req.headers.origin === process.env.ALLOW_ORIGIN) {
        const roomId = await db.createRoom();
        res.send(roomId);
    } else {
        res.statusCode = 405;
        res.send();
    }
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});
