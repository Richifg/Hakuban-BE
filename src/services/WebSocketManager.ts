import WebSocket from 'ws';
import http from 'http';

import faunaDB from './faunaDB';
import RoomManager from './RoomManager';
import { WSMessage, Item, UpdateData, LockData, User, UserData } from '../common/interfaces';
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
        // handle new connection to WS server
        this.wss.on('connection', async (wsc, req) => {
            const urlParams = new URLSearchParams(req.url?.split('/')[1]);
            const roomId = urlParams.get('roomId');
            const password = urlParams.get('password') || '';
            let errorMessage: WSMessage | undefined = undefined;

            if (!roomId) {
                errorMessage = { type: 'error', content: 'Room not specified', userId: 'admin' };
            } else if (!(await this.db.doesRoomExist(roomId))) {
                errorMessage = { type: 'error', content: `Room ${roomId} does not exist`, userId: 'admin' };
            } else if (!(await this.db.isPasswordCorrect(roomId, password))) {
                errorMessage = { type: 'error', content: 'Incorrect room password', userId: 'admin' };
            } else {
                // add new user to room
                const thisUser: User = { client: wsc, id: getNewUserId() };
                this.roomManager.addUser(roomId, thisUser);
                try {
                    // broadcast join message (without user client)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { client, ...cleanUser } = thisUser;
                    const joinMessage: WSMessage = {
                        type: 'user',
                        content: { userAction: 'join', users: [cleanUser] as User[] },
                        userId: thisUser.id,
                    };
                    this.broadcastMessage(roomId, joinMessage);

                    // send new user all other room users
                    const otherUsers = this.roomManager.getRoomUsers(roomId);
                    const othersMessage: WSMessage = {
                        type: 'user',
                        content: {
                            userAction: 'join',
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            users: otherUsers.map(({ client, ...cleanUser }) => cleanUser as User),
                        },
                        userId: 'admin',
                    };
                    wsc.send(JSON.stringify(othersMessage));

                    // send new user all of the room items
                    const roomItems = await this.db.getAllItems(roomId);
                    const message: WSMessage = { type: 'add', content: roomItems, userId: 'admin' };
                    wsc.send(JSON.stringify(message));

                    // finally tell new user its own id to finish initialization
                    const idMessage: WSMessage = { type: 'id', content: thisUser.id, userId: 'admin' };
                    wsc.send(JSON.stringify(idMessage));
                } catch (e) {
                    console.log('Error initializing user', e);
                    this.roomManager.removeUser(roomId, thisUser.id);
                }

                // handle incoming WSMessages
                wsc.on('message', async (msg: string) => {
                    const parsedMsg = JSON.parse(msg) as WSMessage;
                    let message: WSMessage | undefined;
                    const { type, userId } = parsedMsg;
                    // attemp to modify database based on new message
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
                                // update data is valid if item is locked by user
                                const validUpdates = updateData.filter((data) =>
                                    this.roomManager.canEditItem(roomId, userId, data.id),
                                );
                                if (validUpdates.length) {
                                    await Promise.all(validUpdates.map((data) => this.db.updateItem(roomId, data)));
                                    message = { type: 'update', content: validUpdates, userId };
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

                            case 'user':
                                const userData = parsedMsg.content as UserData;
                                // FE can only send 'update' user messages of a single item
                                if (userData.userAction === 'update') {
                                    if (this.roomManager.updateUser(roomId, userData.users[0])) {
                                        message = { type: 'user', content: userData, userId };
                                    }
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

                // handle WS disconnect
                wsc.on('close', () => {
                    // remove user from room and unlock its items
                    const itemIds = this.roomManager.removeUser(roomId, thisUser.id);
                    itemIds.length &&
                        this.broadcastMessage(roomId, {
                            type: 'lock',
                            content: { lockState: false, itemIds },
                            userId: 'admin',
                        });
                    // also broadcast user left message
                    this.broadcastMessage(roomId, {
                        type: 'user',
                        content: { userAction: 'leave', id: thisUser.id },
                        userId: 'admin',
                    });
                });
            }

            if (errorMessage) {
                wsc.send(JSON.stringify(errorMessage));
                wsc.terminate();
            }
        });
    }

    broadcastMessage(roomId: string, message: WSMessage): void {
        // attempt to broacast message to other users in the room
        const stringifiedMessage = JSON.stringify(message);
        try {
            const roomUsers = this.roomManager.getRoomUsers(roomId);
            roomUsers.forEach(({ client }) => {
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
