import RoomManager from './RoomManager';

interface MockUser { a: 1 }
const createMockUser = () => ({ a: 1 } as MockUser);
let roomManager: RoomManager<MockUser>;

beforeEach(() => {
    roomManager = new RoomManager<MockUser>();
});

test('can create multiple rooms', () => {
    expect(roomManager.getActiveRoomIds().length).toBe(0);

    roomManager.createRoom('1');
    expect(roomManager.getActiveRoomIds().length).toBe(1);

    roomManager.createRoom('2');
    expect(roomManager.getActiveRoomIds().length).toBe(2);

    const ids = roomManager.getActiveRoomIds();
    expect(ids.includes('1')).toBe(true);
    expect(ids.includes('2')).toBe(true);
}); 

test('can add users to a room', () => {
    roomManager.createRoom('TEST');
    roomManager.createRoom('OTHER');
    expect(roomManager.getRoomUsers('TEST').length).toBe(0);
    expect(roomManager.getRoomUsers('OTHER').length).toBe(0);

    const user1 = createMockUser();
    const user2 = createMockUser();
    roomManager.addUser('TEST', user1);
    roomManager.addUser('TEST', user2);

    const userOther = createMockUser();
    roomManager.addUser('OTHER', userOther);

    const testUsers = roomManager.getRoomUsers('TEST');
    expect(testUsers.length).toBe(2);
    expect(testUsers.includes(user1)).toBe(true);
    expect(testUsers.includes(user2)).toBe(true);

    const otherUsers = roomManager.getRoomUsers('OTHER');
    expect(otherUsers.length).toBe(1);
    expect(otherUsers.includes(userOther)).toBe(true);
});

test('when adding users, room is created if it doesnt exist', () => {
    expect(roomManager.getActiveRoomIds().length).toBe(0);

    roomManager.addUser('FIRST', createMockUser());
    const roomIds = roomManager.getActiveRoomIds();
    expect(roomIds.length).toBe(1);
    expect(roomIds[0]).toBe('FIRST');
    
});

test('can remove users from a room', () => {
    const user1 = createMockUser();
    roomManager.addUser('TEST', user1);
    const user2 = createMockUser();
    roomManager.addUser('TEST', user2);

    const userOther = createMockUser();
    roomManager.addUser('OTHER', userOther);

    expect(roomManager.getRoomUsers('TEST').length).toBe(2);
    roomManager.removeUser('TEST', user1);
    expect(roomManager.getRoomUsers('TEST').length).toBe(1);
    expect(roomManager.getRoomUsers('TEST').includes(user1)).toBe(false);
    roomManager.removeUser('TEST', user2);
    expect(roomManager.getRoomUsers('TEST').length).toBe(0);

    expect(roomManager.getRoomUsers('OTHER').length).toBe(1);
});

test('can delete a room', () => {
    roomManager.createRoom('TEST');
    roomManager.createRoom('OTHER');

    let ids = roomManager.getActiveRoomIds();
    expect(ids.length).toBe(2);

    roomManager.deleteRoom('OTHER');
    ids = roomManager.getActiveRoomIds();
    expect(ids.length).toBe(1);
    expect(ids.includes('OTHER')).toBe(false);
    expect(ids.includes('TEST')).toBe(true);

    roomManager.deleteRoom('TEST');
    expect(roomManager.getActiveRoomIds().length).toBe(0);
});

test('runs a cb on each user when deleting a room', () => {
    const users = [createMockUser(), createMockUser(), createMockUser()];
    users.forEach((user) => roomManager.addUser('TEST', user));

    const mockCB = jest.fn();
    roomManager.deleteRoom('TEST', mockCB);

    expect(mockCB).toHaveBeenCalledTimes(users.length);
    mockCB.mock.calls.forEach(([user]) => {
        expect(users.includes(user)).toBe(true);
    });
});
