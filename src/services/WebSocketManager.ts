import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';

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
        this.wss.on('connection', async (ws: WebSocket, req) => {
            const urlParams = new URLSearchParams(req.url?.split('/')[1]);
            const roomId = urlParams.get('roomId');
        
            if (!roomId) {
                ws.send('Room not specified');
                ws.terminate();
            } else if (!await this.db.doesRoomExist(roomId)) {
                ws.send(`Room ${roomId} does not exist`);
                ws.terminate();
            } else {
                this.roomManager.addUser(roomId, ws);
                ws.send(`Entered room ${roomId}!`);
        
                const roomItems  = await this.db.readAllItems(roomId);
                ws.send(roomItems);
        
                ws.on('message', async (msg: string) => {
                    console.log(`received: ${msg}`);
                    const item = await this.db.addItem(roomId, { itemType: 'text', coordinates: '0,0', content: msg  });
                    this.roomManager.getRoomUsers(roomId).forEach((client) => {
                        if (client.readyState === 1) {
                            client.send(`Broadcasting: ${item}`);
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
