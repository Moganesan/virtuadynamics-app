import SocketIO from 'socket.io-client';

const LOCAL_BASE_URL = 'http://172.20.10.3:3000';

let socket: ReturnType<typeof SocketIO> | null = null;

export function getSocket() {
    if (!socket) {
        socket = SocketIO(LOCAL_BASE_URL, {
            autoConnect: false,
            transports: ['websocket'],
        });
    }
    return socket;
}

export function connectSocket(userId: string) {
    const s = getSocket();
    if (!s.connected) {
        console.debug(`[DEBUG][Socket] Connecting socket for userId=${userId}...`);
        s.connect();
        s.on('connect', () => {
            console.debug(`[DEBUG][Socket] Connected, joining room userId=${userId}`);
            s.emit('join', userId);
        });
        s.on('connect_error', (err: any) => {
            console.error('[DEBUG][Socket] Connection error:', err);
        });
        s.on('disconnect', (reason: string) => {
            console.debug(`[DEBUG][Socket] Disconnected, reason=${reason}`);
        });
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        console.debug('[DEBUG][Socket] Disconnecting socket...');
        socket.disconnect();
    }
}
