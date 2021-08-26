import WebSocket from "ws";

class RoomManager {
    private activeRooms: { [key: string]: WebSocket[] };
    
    constructor() {
        this.activeRooms = {};
    }
    
    getActiveRoomCount(): number {
        return Object.values(this.activeRooms).length;
    }
    
    getRoomUserCount(roomId: string): number {
        return this.activeRooms[roomId]?.length || 0;
    }

    getRoomUsers(roomId: string): WebSocket[] {
        return this.activeRooms[roomId] || [];
    }
    
    createRoom(roomId: string): void {
        this.activeRooms[roomId] = [];
        console.log(`room ${roomId} created`);
    }
    
    deleteRoom(roomId: string): void {
        delete this.activeRooms[roomId];
        console.log(`room ${roomId} deleted`);
    }
    
    addUser(roomId: string, ws: WebSocket): void {
        if (!this.activeRooms[roomId]) {
            this.createRoom(roomId);
        }
        this.activeRooms[roomId].push(ws);
        console.log(`some entered room ${roomId}, new count: ${this.getRoomUserCount(roomId)}`);
    }
    
    removeUser(roomId: string, ws: WebSocket): void {
        if (this.activeRooms[roomId]) {
            this.activeRooms[roomId] = this.activeRooms[roomId].filter(socket => socket !== ws);
        }
        console.log(`someone left room ${roomId}, new count: ${this.getRoomUserCount(roomId)}`);
    }

}

export default RoomManager;
