import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import WebSocket, { AddressInfo } from 'ws';

import db from './services/faunaDB';
import RoomManager from './services/RoomManager';
import WebSocketManager from './services/WebSocketManager';

// express app
const app = express();

// Add headers before the routes are defined
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

// initialize services
const server = http.createServer(app);
const roomManager = new RoomManager<WebSocket>();
const webSocketManager = new WebSocketManager(server, roomManager, db);

webSocketManager.start();

// routes
app.get('/', (_, res) => {
    res.send('Hello World!');
});

app.post('/room', async (_, res) => {
    const roomId = await db.createRoom();
    res.send(roomId);
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});
