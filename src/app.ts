import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { AddressInfo } from 'ws';

import db from './services/faunaDB';
import RoomManager from './services/RoomManager';
import WebSocketManager from './services/WebSocketManager';

const app = express();

// cors policy
app.use(function (_, res, next) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

// parser middleware
app.use(express.json());

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
    const password = req.body?.password || '';
    try {
        const roomId = await db.createRoom(password);
        roomManager.createRoom(roomId);
        res.send(roomId);
    } catch (e) {
        res.statusCode = 500;
        res.send(e);
    }
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});
