const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const cors = require('cors');

const server = http.createServer(app);




const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use(cors());

// A map to associate a username with a socket ID to ensure uniqueness
const userSocketMap = {};

// A map to associate a socket ID with a username
const socketUserMap = {};

function getAllConnectedClients(roomId) {
    const clients = [];
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
        room.forEach((socketId) => {
            if (socketUserMap[socketId]) {
                clients.push({
                    socketId,
                    username: socketUserMap[socketId],
                });
            }
        });
    }
    return clients;
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        // Disconnect the old socket if the same user is already connected
        if (userSocketMap[username]) {
            const oldSocketId = userSocketMap[username];
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket && oldSocket.id !== socket.id) {
                oldSocket.disconnect(true);
            }
        }

        userSocketMap[username] = socket.id;
        socketUserMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        const username = socketUserMap[socket.id];
        
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username,
            });
        });

        // Clean up user mappings
        delete userSocketMap[username];
        delete socketUserMap[socket.id];

        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
