import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';
import { WSMessage } from '../common/interfaces';
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
                const message: WSMessage = { type: 'error', content: 'Room not specified' };
                ws.send(JSON.stringify(message));
                ws.terminate();
            } else if (!(await this.db.doesRoomExist(roomId))) {
                const message: WSMessage = { type: 'error', content: `Room ${roomId} does not exist` };
                ws.send(JSON.stringify(message));
                ws.terminate();
            } else {
                this.roomManager.addUser(roomId, ws);
                try {
                    const userId = NewId();
                    const idMessage: WSMessage = { type: 'id', content: userId };
                    ws.send(JSON.stringify(idMessage));
                    const roomItems = await this.db.readAllItems(roomId);
                    const collectionMessage: WSMessage = { type: 'collection', content: roomItems };
                    ws.send(JSON.stringify(collectionMessage));
                } catch (e) {
                    console.log('Error reading items', e);
                }

                ws.on('message', async (msg: string) => {
                    const parsedMsg = JSON.parse(msg) as WSMessage;
                    console.log(parsedMsg.type);
                    // attemp to modify database based on new message
                    let stringifiedMessage = '';
                    try {
                        if (parsedMsg.type === 'item') {
                            const savedItem = await this.db.addItem(roomId, parsedMsg.content);
                            console.log(savedItem, 'success');
                            const message: WSMessage = { type: 'item', content: savedItem };
                            stringifiedMessage = JSON.stringify(message);
                        } else if (parsedMsg.type === 'delete') {
                            const id = parsedMsg.content;
                            await this.db.removeItem(roomId, id);
                            const message: WSMessage = { type: 'delete', content: id };
                            stringifiedMessage = JSON.stringify(message);
                        }
                    } catch (e) {
                        console.log('Database write error', msg, e);
                    }

                    // attempt to broacast message to other users in the room
                    try {
                        this.roomManager.getRoomUsers(roomId).forEach((client) => {
                            if (client.readyState === 1) {
                                client.send(stringifiedMessage);
                            }
                        });
                    } catch (e) {
                        console.log('Error broadcasting message', parsedMsg, e);
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
