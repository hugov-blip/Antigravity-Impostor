// server.js - Servidor principal

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./server/room-manager');
const gameLogic = require('./server/game-logic');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const roomManager = new RoomManager();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io - Eventos en tiempo real
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Crear sala
    socket.on('create-room', (playerName, callback) => {
        try {
            const room = roomManager.createRoom(socket.id, playerName);
            socket.join(room.code);

            callback({
                success: true,
                room: {
                    code: room.code,
                    players: room.players,
                    config: room.config,
                    isHost: true
                }
            });

            console.log(`Sala creada: ${room.code} por ${playerName}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Unirse a sala
    socket.on('join-room', (data, callback) => {
        try {
            const { roomCode, playerName } = data;
            const room = roomManager.joinRoom(roomCode, socket.id, playerName);

            if (!room) {
                return callback({ success: false, error: 'Sala no encontrada' });
            }

            if (room.isPlaying) {
                return callback({ success: false, error: 'El juego ya ha comenzado' });
            }

            socket.join(room.code);

            // Notificar a todos en la sala
            io.to(room.code).emit('player-joined', {
                player: room.players[room.players.length - 1],
                players: room.players
            });

            callback({
                success: true,
                room: {
                    code: room.code,
                    players: room.players,
                    config: room.config,
                    isHost: socket.id === room.host
                }
            });

            console.log(`${playerName} se unió a la sala ${room.code}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Actualizar configuración
    socket.on('update-config', (config) => {
        const room = roomManager.getPlayerRoom(socket.id);

        if (!room || room.host !== socket.id) {
            return;
        }

        roomManager.updateConfig(room.code, config);
        io.to(room.code).emit('config-updated', config);
    });

    // Iniciar juego
    socket.on('start-game', (callback) => {
        try {
            const room = roomManager.getPlayerRoom(socket.id);

            if (!room || room.host !== socket.id) {
                return callback({ success: false, error: 'Solo el host puede iniciar el juego' });
            }

            if (room.players.length < 3) {
                return callback({ success: false, error: 'Se necesitan al menos 3 jugadores' });
            }

            if (room.config.impostorCount >= room.players.length) {
                return callback({ success: false, error: 'Hay demasiados impostores para este número de jugadores' });
            }

            // Inicializar el juego
            const gameState = gameLogic.initializeGame(room.players, room.config);
            roomManager.startGame(room.code, gameState);

            // Enviar asignaciones individuales a cada jugador
            room.players.forEach(player => {
                io.to(player.id).emit('word-assignment', {
                    assignment: gameState.assignments[player.id],
                    turnOrder: gameState.turnOrder.map(p => ({ id: p.id, name: p.name })),
                    currentTurn: gameState.turnOrder[0]
                });
            });

            callback({ success: true });
            console.log(`Juego iniciado en sala ${room.code}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Jugador ha visto su palabra
    socket.on('word-revealed', () => {
        const room = roomManager.getPlayerRoom(socket.id);
        if (room) {
            socket.to(room.code).emit('player-ready', socket.id);
        }
    });

    // Enviar mensaje de chat
    socket.on('send-chat-message', (message, callback) => {
        try {
            const room = roomManager.getPlayerRoom(socket.id);

            if (!room || !room.gameState) {
                return callback({ success: false, error: 'No estás en una partida activa' });
            }

            const currentPlayer = room.gameState.turnOrder[room.gameState.currentTurnIndex];

            if (currentPlayer.id !== socket.id) {
                return callback({ success: false, error: 'No es tu turno' });
            }

            const chatMessage = {
                playerId: socket.id,
                playerName: currentPlayer.name,
                message: message,
                timestamp: Date.now()
            };

            roomManager.addChatMessage(room.code, chatMessage);
            io.to(room.code).emit('chat-message', chatMessage);

            // Avanzar al siguiente turno
            const nextPlayer = roomManager.nextTurn(room.code);
            io.to(room.code).emit('turn-changed', nextPlayer);

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Agregar amigo
    socket.on('add-friend', (friendId) => {
        const room = roomManager.getPlayerRoom(socket.id);

        if (!room) {
            return;
        }

        const success = roomManager.addFriend(room.code, socket.id, friendId);

        if (success) {
            const player = room.players.find(p => p.id === socket.id);
            const friend = room.players.find(p => p.id === friendId);

            io.to(socket.id).emit('friend-added', friend);
            io.to(friendId).emit('friend-added', player);

            // Actualizar lista de jugadores para todos
            io.to(room.code).emit('players-updated', room.players);
        }
    });

    // Desconexión
    socket.on('disconnect', () => {
        const roomCode = roomManager.removePlayer(socket.id);

        if (roomCode) {
            const room = roomManager.getRoom(roomCode);

            if (room) {
                io.to(roomCode).emit('player-left', {
                    playerId: socket.id,
                    players: room.players,
                    newHost: room.host
                });
            }
        }

        console.log(`Usuario desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log('\n===========================================');
    console.log('🎮 SERVIDOR DEL JUEGO DEL IMPOSTOR 🎮');
    console.log('===========================================');
    console.log(`\n✅ Servidor iniciado en el puerto ${PORT}`);
    console.log(`\n📱 Accede desde este dispositivo:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n📱 Accede desde otros dispositivos en la misma red:`);
    console.log(`   http://<TU_IP_LOCAL>:${PORT}`);
    console.log(`\n💡 Tip: Para encontrar tu IP local:`);
    console.log(`   Windows: ipconfig`);
    console.log(`   Mac/Linux: ifconfig o ip addr`);
    console.log('\n===========================================\n');
});
