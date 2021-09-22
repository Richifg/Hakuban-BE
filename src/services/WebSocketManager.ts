import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';
import { Message } from '../common/interfaces';

class WebSocketManager {
    private wss: WebSocket.Server;
    private roomManager: RoomManager<WebSocket>;
    private db: typeof faunaDB;

    constructor(httpServer: http.Server, roomManager: RoomManager<WebSocket>, db: typeof faunaDB) {
        this.wss =  new WebSocket.Server({ server: httpServer });
        this.roomManager = roomManager;
        this.db = db;
    }

    start(): void {
        this.wss.on('connection', async (ws, req) => {
            const urlParams = new URLSearchParams(req.url?.split('/')[1]);
            const roomId = urlParams.get('roomId');
        
            if (!roomId) {
                const message: Message = { type: 'error', error: 'Room not specified' };
                ws.send(message);
                ws.terminate();
            } else if (!await this.db.doesRoomExist(roomId)) {
                const message: Message = { type: 'error', error: `Room ${roomId} does not exist`};
                ws.send(message);
                ws.terminate();
            } else {
                this.roomManager.addUser(roomId, ws);
                const roomItems  = await this.db.readAllItems(roomId);
                const message: Message = { type: 'collection', items: roomItems };
                ws.send(message);
        
                ws.on('message', async (msg: string) => {
                    console.log(`received: ${msg}`);
                    const item = await this.db.addItem(roomId, { itemType: 'text', coordinates: '0,0', content: msg  });
                    const message: Message = { type: 'item', item };
                    this.roomManager.getRoomUsers(roomId).forEach((client) => {
                        if (client.readyState === 1) {
                            client.send(message);
                        }
                    });
                });
        
                ws.on('close', () => {
                    this.roomManager.removeUser(roomId, ws);
                });
            }
        });
    }
}

export default WebSocketManager;
