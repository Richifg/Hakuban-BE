class RoomManager<User> {
    private activeRooms: { [key: string]: User[] };

    constructor() {
        this.activeRooms = {};
    }

    getActiveRoomIds(): string[] {
        return Object.keys(this.activeRooms);
    }

    getRoomUsers(roomId: string): User[] {
        return this.activeRooms[roomId] || [];
    }

    createRoom(roomId: string): void {
        this.activeRooms[roomId] = [];
        // console.log(`room ${roomId} created`);
    }

    deleteRoom(roomId: string, callBack?: (user: User) => void): void {
        callBack && this.activeRooms[roomId].forEach((user) => callBack(user));
        delete this.activeRooms[roomId];
        // console.log(`room ${roomId} deleted`);
    }

    addUser(roomId: string, user: User): void {
        if (!this.activeRooms[roomId]) {
            this.createRoom(roomId);
        }
        this.activeRooms[roomId].push(user);
        // console.log(`some entered room ${roomId}, new count: ${this.getRoomUsers(roomId).length}`);
    }

    removeUser(roomId: string, userToRemove: User): void {
        if (this.activeRooms[roomId]) {
            this.activeRooms[roomId] = this.activeRooms[roomId].filter((user) => user !== userToRemove);
        }
        // console.log(`someone left room ${roomId}, new count: ${this.getRoomUsers(roomId).length}`);
    }
}

export default RoomManager;
