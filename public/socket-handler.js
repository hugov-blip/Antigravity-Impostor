// socket-handler.js - Manejo de eventos Socket.io

class SocketHandler {
    constructor() {
        this.socket = io();
        this.currentRoom = null;
        this.playerName = null;
        this.isHost = false;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Jugador se unió a la sala
        this.socket.on('player-joined', (data) => {
            window.dispatchEvent(new CustomEvent('player-joined', { detail: data }));
        });

        // Jugador salió de la sala
        this.socket.on('player-left', (data) => {
            window.dispatchEvent(new CustomEvent('player-left', { detail: data }));
        });

        // Configuración actualizada
        this.socket.on('config-updated', (config) => {
            window.dispatchEvent(new CustomEvent('config-updated', { detail: config }));
        });

        // Asignación de palabra
        this.socket.on('word-assignment', (data) => {
            window.dispatchEvent(new CustomEvent('word-assignment', { detail: data }));
        });

        // Jugador listo
        this.socket.on('player-ready', (playerId) => {
            window.dispatchEvent(new CustomEvent('player-ready', { detail: playerId }));
        });

        // Mensaje de chat
        this.socket.on('chat-message', (message) => {
            window.dispatchEvent(new CustomEvent('chat-message', { detail: message }));
        });

        // Turno cambiado
        this.socket.on('turn-changed', (player) => {
            window.dispatchEvent(new CustomEvent('turn-changed', { detail: player }));
        });

        // Amigo agregado
        this.socket.on('friend-added', (friend) => {
            window.dispatchEvent(new CustomEvent('friend-added', { detail: friend }));
        });

        // Jugadores actualizados
        this.socket.on('players-updated', (players) => {
            window.dispatchEvent(new CustomEvent('players-updated', { detail: players }));
        });

        // Todos los jugadores listos
        this.socket.on('all-players-ready', () => {
            window.dispatchEvent(new CustomEvent('all-players-ready'));
        });

        // Voting events
        this.socket.on('voting-start', (data) => {
            window.dispatchEvent(new CustomEvent('voting-start', { detail: data }));
        });

        this.socket.on('player-eliminated', (data) => {
            window.dispatchEvent(new CustomEvent('player-eliminated', { detail: data }));
        });

        this.socket.on('game-over', (data) => {
            window.dispatchEvent(new CustomEvent('game-over', { detail: data }));
        });

        this.socket.on('voting-result-skip', (data) => {
            window.dispatchEvent(new CustomEvent('voting-skip', { detail: data }));
        });
    }

    // Crear sala
    createRoom(playerName, callback) {
        this.playerName = playerName;
        this.socket.emit('create-room', playerName, (response) => {
            if (response.success) {
                this.currentRoom = response.room.code;
                this.isHost = true;
            }
            callback(response);
        });
    }

    // Unirse a sala
    joinRoom(roomCode, playerName, callback) {
        this.playerName = playerName;
        this.socket.emit('join-room', { roomCode, playerName }, (response) => {
            if (response.success) {
                this.currentRoom = response.room.code;
                this.isHost = response.room.isHost;
            }
            callback(response);
        });
    }

    // Actualizar configuración
    updateConfig(config) {
        this.socket.emit('update-config', config);
    }

    // Iniciar juego
    startGame(callback) {
        this.socket.emit('start-game', callback);
    }

    // Palabra revelada
    wordRevealed() {
        this.socket.emit('word-revealed');
    }

    // Enviar mensaje de chat
    sendChatMessage(message, callback) {
        this.socket.emit('send-chat-message', message, callback);
    }

    // Agregar amigo
    addFriend(friendId) {
        this.socket.emit('add-friend', friendId);
    }

    // Send chat message (with round tracking)
    sendChatMessage(message, callback = () => { }) {
        this.socket.emit('send-chat-message', message, callback);
    }

    // Submit vote
    submitVote(targetId, callback = () => { }) {
        this.socket.emit('submit-vote', targetId, callback);
    }

    // Obtener ID del socket
    getSocketId() {
        return this.socket.id;
    }
}

// Instancia global
window.socketHandler = new SocketHandler();
