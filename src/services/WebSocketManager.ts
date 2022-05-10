import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';
import { WSMessage, Item, UpdateData, LockData, User } from '../common/interfaces';
import { getNewUserId } from '../common/functions';

class WebSocketManager {
    private wss: WebSocket.Server;
    private roomManager: RoomManager;
    private db: typeof faunaDB;

    constructor(httpServer: http.Server, roomManager: RoomManager, db: typeof faunaDB) {
        this.wss = new WebSocket.Server({ server: httpServer });
        this.roomManager = roomManager;
        this.db = db;
    }

    start(): void {
        this.wss.on('connection', async (wsc, req) => {
            const urlParams = new URLSearchParams(req.url?.split('/')[1]);
            const roomId = urlParams.get('roomId');

            if (!roomId) {
                const message: WSMessage = { type: 'error', content: 'Room not specified', userId: 'admin' };
                wsc.send(JSON.stringify(message));
                wsc.terminate();
            } else if (!(await this.db.doesRoomExist(roomId))) {
                const message: WSMessage = { type: 'error', content: `Room ${roomId} does not exist`, userId: 'admin' };
                wsc.send(JSON.stringify(message));
                wsc.terminate();
            } else {
                // create new user, send its id and all the items
                const newUser: User = { client: wsc, id: getNewUserId() };
                this.roomManager.addUser(roomId, newUser);
                try {
                    const idMessage: WSMessage = { type: 'id', content: newUser.id, userId: 'admin' };
                    wsc.send(JSON.stringify(idMessage));
                    const roomItems = await this.db.getAllItems(roomId);
                    const message: WSMessage = { type: 'add', content: roomItems, userId: 'admin' };
                    wsc.send(JSON.stringify(message));
                } catch (e) {
                    console.log('Error initializing user', e);
                }

                wsc.on('message', async (msg: string) => {
                    const parsedMsg = JSON.parse(msg) as WSMessage;
                    let message: WSMessage | undefined;
                    const { type, userId } = parsedMsg;
                    // attemp to modify database based on new message
                    console.log(type);
                    try {
                        switch (type) {
                            case 'add':
                                const items = parsedMsg.content as Item[]; // TODO: why is tsc forcing me to do this???
                                const addedItems = await Promise.all(
                                    items.map((item) => this.db.addItem(roomId, item)),
                                );
                                message = { type: 'add', content: addedItems, userId };
                                break;

                            case 'update':
                                const updateData = parsedMsg.content as UpdateData[];
                                const validUpdates = updateData.filter((data) =>
                                    this.roomManager.canEditItem(roomId, userId, data.id),
                                );
                                if (validUpdates.length) {
                                    await Promise.all(validUpdates.map((data) => this.db.updateItem(roomId, data)));
                                    message = { type: 'update', content: updateData, userId };
                                }
                                break;

                            case 'delete':
                                const idsToDelete = parsedMsg.content as string[];
                                const validIds = idsToDelete.filter((id) =>
                                    this.roomManager.canEditItem(roomId, userId, id),
                                );
                                if (validIds) {
                                    await Promise.all(validIds.map((id) => this.db.removeItem(roomId, id)));
                                    message = { type: 'delete', content: idsToDelete, userId };
                                }
                                break;

                            case 'lock':
                                const lockData = parsedMsg.content as LockData;
                                const sucessfullIds = this.roomManager.toggleItemsLock(roomId, userId, lockData);
                                if (sucessfullIds.length) {
                                    const content = { lockState: lockData.lockState, itemIds: sucessfullIds };
                                    message = { type: 'lock', content, userId };
                                }
                                break;
                        }
                    } catch (e) {
                        message = {
                            type: 'error',
                            content: 'Database write error: ' + e,
                            userId: 'admin',
                        };
                    }
                    if (message) {
                        this.broadcastMessage(roomId, message);
                    }
                });

                wsc.on('close', () => {
                    // reomove user from room and unlock its items
                    const itemIds = this.roomManager.removeUser(roomId, newUser.id);
                    itemIds.length &&
                        this.broadcastMessage(roomId, {
                            type: 'lock',
                            content: { lockState: false, itemIds },
                            userId: 'admin',
                        });
                });
            }
        });
    }
    broadcastMessage(roomId: string, message: WSMessage): void {
        // attempt to broacast message to other users in the room
        const stringifiedMessage = JSON.stringify(message);
        try {
            this.roomManager.getRoomUsers(roomId).forEach(({ client }) => {
                if (client.readyState === 1 && stringifiedMessage) {
                    client.send(stringifiedMessage);
                }
            });
        } catch (e) {
            console.log('Error broadcasting message' + e);
        }
    }
}

export default WebSocketManager;
