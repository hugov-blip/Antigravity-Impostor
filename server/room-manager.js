// room-manager.js - Gestión de salas

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> room object
    }

    /**
     * Genera un código único de sala
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        // Verificar que no exista ya
        if (this.rooms.has(code)) {
            return this.generateRoomCode();
        }

        return code;
    }

    /**
     * Crea una nueva sala
     * @param {string} hostId - ID del socket del host
     * @param {string} hostName - Nombre del host
     * @returns {Object} - Datos de la sala creada
     */
    createRoom(hostId, hostName) {
        const roomCode = this.generateRoomCode();

        const room = {
            code: roomCode,
            host: hostId,
            players: [{
                id: hostId,
                name: hostName,
                friends: []
            }],
            config: {
                impostorCount: 1,
                includeHint: false
            },
            gameState: null, // Se llena cuando empieza el juego
            isPlaying: false
        };

        this.rooms.set(roomCode, room);
        return room;
    }

    /**
     * Une a un jugador a una sala existente
     * @param {string} roomCode - Código de la sala
     * @param {string} playerId - ID del socket del jugador
     * @param {string} playerName - Nombre del jugador
     * @returns {Object|null} - Datos de la sala o null si no existe
     */
    joinRoom(roomCode, playerId, playerName) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room) {
            return null;
        }

        // Verificar si el jugador ya está en la sala
        const existingPlayer = room.players.find(p => p.id === playerId);
        if (existingPlayer) {
            return room;
        }

        // Agregar nuevo jugador
        room.players.push({
            id: playerId,
            name: playerName,
            friends: []
        });

        return room;
    }

    /**
     * Remueve un jugador de una sala
     * @param {string} playerId - ID del socket del jugador
     * @returns {string|null} - Código de la sala o null
     */
    removePlayer(playerId) {
        for (const [code, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === playerId);

            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);

                // Si la sala queda vacía, eliminarla
                if (room.players.length === 0) {
                    this.rooms.delete(code);
                    return null;
                }

                // Si el host se fue, asignar nuevo host
                if (room.host === playerId && room.players.length > 0) {
                    room.host = room.players[0].id;
                }

                return code;
            }
        }

        return null;
    }

    /**
     * Obtiene una sala por código
     * @param {string} roomCode - Código de la sala
     * @returns {Object|null}
     */
    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase()) || null;
    }

    /**
     * Obtiene la sala de un jugador
     * @param {string} playerId - ID del socket del jugador
     * @returns {Object|null}
     */
    getPlayerRoom(playerId) {
        for (const room of this.rooms.values()) {
            if (room.players.find(p => p.id === playerId)) {
                return room;
            }
        }
        return null;
    }

    /**
     * Actualiza la configuración de una sala
     * @param {string} roomCode - Código de la sala
     * @param {Object} config - Nueva configuración
     * @returns {boolean}
     */
    updateConfig(roomCode, config) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room) {
            return false;
        }

        room.config = { ...room.config, ...config };
        return true;
    }

    /**
     * Agrega un amigo a un jugador dentro de una sala
     * @param {string} roomCode - Código de la sala
     * @param {string} playerId - ID del jugador
     * @param {string} friendId - ID del amigo
     * @returns {boolean}
     */
    addFriend(roomCode, playerId, friendId) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room) {
            return false;
        }

        const player = room.players.find(p => p.id === playerId);
        const friend = room.players.find(p => p.id === friendId);

        if (!player || !friend) {
            return false;
        }

        // Agregar mutuamente si no son amigos ya
        if (!player.friends.includes(friendId)) {
            player.friends.push(friendId);
        }

        if (!friend.friends.includes(playerId)) {
            friend.friends.push(playerId);
        }

        return true;
    }

    /**
     * Inicia el juego en una sala
     * @param {string} roomCode - Código de la sala
     * @param {Object} gameState - Estado inicial del juego
     * @returns {boolean}
     */
    startGame(roomCode, gameState) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room) {
            return false;
        }

        room.gameState = gameState;
        room.isPlaying = true;
        return true;
    }

    /**
     * Avanza al siguiente turno
     * @param {string} roomCode - Código de la sala
     * @returns {Object|null} - Jugador actual o null
     */
    nextTurn(roomCode) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room || !room.gameState) {
            return null;
        }

        room.gameState.currentTurnIndex =
            (room.gameState.currentTurnIndex + 1) % room.gameState.turnOrder.length;

        return room.gameState.turnOrder[room.gameState.currentTurnIndex];
    }

    /**
     * Agrega un mensaje al chat
     * @param {string} roomCode - Código de la sala
     * @param {Object} message - Mensaje a agregar
     * @returns {boolean}
     */
    addChatMessage(roomCode, message) {
        const room = this.rooms.get(roomCode.toUpperCase());

        if (!room || !room.gameState) {
            return false;
        }

        room.gameState.chatMessages.push(message);
        return true;
    }
}

module.exports = RoomManager;
