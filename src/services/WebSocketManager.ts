import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';
import { WSMessage, Item, UpdateData } from '../common/interfaces';
import { NewId } from '../common/functions';

class WebSocketManager {
    private wss: WebSocket.Server;
    private roomManager: RoomManager<WebSocket>;
    private db: typeof faunaDB;

    constructor(httpServer: http.Server, roomManager: RoomManager<WebSocket>, db: typeof faunaDB) {
        this.wss = new WebSocket.Server({ server: httpServer });
        this.roomManager = roomManager;
        this.db = db;
    }

    start(): void {
        this.wss.on('connection', async (ws, req) => {
            const urlParams = new URLSearchParams(req.url?.split('/')[1]);
            const roomId = urlParams.get('roomId');

            if (!roomId) {
                const message: WSMessage = { type: 'error', content: 'Room not specified', userId: 'admin' };
                ws.send(JSON.stringify(message));
                ws.terminate();
            } else if (!(await this.db.doesRoomExist(roomId))) {
                const message: WSMessage = { type: 'error', content: `Room ${roomId} does not exist`, userId: 'admin' };
                ws.send(JSON.stringify(message));
                ws.terminate();
            } else {
                this.roomManager.addUser(roomId, ws);
                try {
                    const userId = NewId();
                    const idMessage: WSMessage = { type: 'id', content: userId, userId: 'admin' };
                    ws.send(JSON.stringify(idMessage));
                    const roomItems = await this.db.getAllItems(roomId);
                    const message: WSMessage = { type: 'add', content: roomItems, userId: 'admin' };
                    ws.send(JSON.stringify(message));
                } catch (e) {
                    console.log('Error reading items', e);
                }

                ws.on('message', async (msg: string) => {
                    const parsedMsg = JSON.parse(msg) as WSMessage;
                    let stringifiedMessage = '';
                    const { type, userId } = parsedMsg;
                    // attemp to modify database based on new message
                    try {
                        if (type === 'add') {
                            const items = parsedMsg.content as Item[]; // TODO: why is tsc forcing me to do this???
                            const addedItems = await Promise.all(items.map((item) => this.db.addItem(roomId, item)));
                            const message: WSMessage = { type: 'add', content: addedItems, userId };
                            stringifiedMessage = JSON.stringify(message);
                        } else if (type === 'update') {
                            const updateData = parsedMsg.content as UpdateData[];
                            await Promise.all(updateData.map((data) => this.db.updateItem(roomId, data)));
                            const message: WSMessage = { type: 'update', content: updateData, userId };
                            stringifiedMessage = JSON.stringify(message);
                        } else if (type === 'delete') {
                            const ids = parsedMsg.content as string[];
                            await Promise.all(ids.map((id) => this.db.removeItem(roomId, id)));
                            const message: WSMessage = { type: 'delete', content: ids, userId };
                            stringifiedMessage = JSON.stringify(message);
                        }
                    } catch (e) {
                        const message: WSMessage = {
                            type: 'error',
                            content: 'Database write error: ' + e,
                            userId: 'admin',
                        };
                        stringifiedMessage = JSON.stringify(message);
                    }

                    // attempt to broacast message to other users in the room
                    try {
                        this.roomManager.getRoomUsers(roomId).forEach((client) => {
                            if (client.readyState === 1 && stringifiedMessage) {
                                client.send(stringifiedMessage);
                            }
                        });
                    } catch (e) {
                        console.log('Error broadcasting message' + e);
                    }
                });

                ws.on('close', () => {
                    this.roomManager.removeUser(roomId, ws);
                });
            }
        });
    }
}

export default WebSocketManager;
