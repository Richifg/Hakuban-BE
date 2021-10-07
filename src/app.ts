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

// initialize services
const server = http.createServer(app);
const roomManager = new RoomManager<WebSocket>();
const webSocketManager = new WebSocketManager(server, roomManager, db);

webSocketManager.start();

// routes
app.get('/', (_, res) => {
    res.send('Hello World!');
});

server.listen(process.env.PORT, () => {
    console.log(`Opened a websocket server at ${(server.address() as AddressInfo).port}`);
});
