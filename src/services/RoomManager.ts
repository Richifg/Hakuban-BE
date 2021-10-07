interface Room<User> {
    users: User[];
    password?: string;
}

class RoomManager<User> {
    private activeRooms: { [key: string]: Room<User> };

    constructor() {
        this.activeRooms = {};
    }

    getActiveRoomIds(): string[] {
        return Object.keys(this.activeRooms);
    }

    getRoomUsers(roomId: string): User[] {
        return this.activeRooms[roomId].users || [];
    }

    createRoom(roomId: string, password?: string): void {
        this.activeRooms[roomId] = { users: [], password };
    }

    deleteRoom(roomId: string, callBack?: (user: User) => void): void {
        callBack && this.activeRooms[roomId].users.forEach((user) => callBack(user));
        delete this.activeRooms[roomId];
    }

    addUser(roomId: string, user: User, password?: string): boolean {
        // create room first if it doesn't exist
        if (!this.activeRooms[roomId]) {
            this.createRoom(roomId, password);
            this.activeRooms[roomId].users.push(user);
            return true;
        }
        const roomPassword = this.activeRooms[roomId].password;
        if (!roomPassword || roomPassword === password) {
            this.activeRooms[roomId].users.push(user);
            return true;
        }
        return false;
    }

    removeUser(roomId: string, userToRemove: User): void {
        if (this.activeRooms[roomId]) {
            this.activeRooms[roomId].users = this.activeRooms[roomId].users.filter((user) => user !== userToRemove);
        }
    }
}

export default RoomManager;
