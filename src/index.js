const express = require('express');
const app = express();
const path = require('path');
const Filter = require('bad-words');
const {
    generateMessage,
    generateLocationMessage,
} = require('./utils/messages');
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
} = require('./utils/users');
const port = process.env.PORT || 3000;

// set up websockets
const http = require('http');
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server);

// set up static directory to serve
const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

let count = 0;
const msg = 'Welcome!';
let chat = 'connected to the chat!';
let location;

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit('message', generateMessage('Admin', 'Welcome!'));

        // emits to everyone except the one who just connected
        socket.broadcast
            .to(user.room)
            .emit(
                'message',
                generateMessage('Admin', `${user.username} has joined`)
            );
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        });

        callback();
    });

    socket.on('sendMessage', (mes, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(mes)) {
            return callback('Profanity is not allowed!');
        }
        /* emits to every single connections*/
        io.to(user.room).emit('message', generateMessage(user.username, mes));
        callback();
    });

    // geolocation handler
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        location = `https://google.com/maps?q=${coords.latitude},${coords.longitude}`;
        io.to(user.room).emit(
            'locationMessage',
            generateLocationMessage(user.username, location)
        );
        callback('delivered');
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                generateMessage('Admin', `${user.username} has left`)
            );
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            });
        }
    });
});

// run the server
server.listen(port, () => {
    console.log(`server is listening to ${port}`);
});

/* emits to single user */
//socket.emit('countUpdated', count)
