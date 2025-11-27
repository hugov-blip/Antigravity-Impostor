// Definición de elementos del DOM
const elements = {
    // Pantalla de bienvenida
    playerNameInput: document.getElementById('player-name-input'),
    continueBtn: document.getElementById('continue-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),

    // Modal de unirse
    joinModal: document.getElementById('join-modal'),
    roomCodeInput: document.getElementById('room-code-input'),
    cancelJoinBtn: document.getElementById('cancel-join-btn'),
    confirmJoinBtn: document.getElementById('confirm-join-btn'),

    // Lobby
    roomCodeDisplay: document.getElementById('room-code'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    gameConfig: document.getElementById('game-config'),
    impostorCountInput: document.getElementById('impostor-count'),
    includeHintInput: document.getElementById('include-hint'),
    startGameBtn: document.getElementById('start-game-btn'),
    copyCodeBtn: document.getElementById('copy-code-btn'),
    shareLinkBtn: document.getElementById('share-link-btn'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),

    // Pantalla de revelación
    wordDisplay: document.getElementById('word-display'),
    hintDisplay: document.getElementById('hint-display'),
    readyBtn: document.getElementById('ready-btn'),

    // Pantalla de juego
    turnOrderList: document.getElementById('turn-order-list'),
    currentTurnName: document.getElementById('current-turn-name'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat-btn'),

    // Toast
    toast: document.getElementById('toast')
};

// Estado de la aplicación
const appState = {
    playerName: '',
    roomCode: '',
    players: [],
    config: { impostorCount: 1, includeHint: false },
    assignment: null,
    turnOrder: [],
    currentTurn: null
};

// ========== Utilidades ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(`${screenId}-screen`).classList.add('active');
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('active');
    setTimeout(() => elements.toast.classList.remove('active'), 3000);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0].toUpperCase()).join('').substring(0, 2);
}

// ========== Pantalla de Bienvenida ==========
elements.playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.continueBtn.click();
    }
});

elements.playerNameInput.addEventListener('input', () => {
    const hasName = elements.playerNameInput.value.trim().length > 0;
    elements.continueBtn.disabled = !hasName;
    elements.createRoomBtn.disabled = !hasName;
    elements.joinRoomBtn.disabled = !hasName;
});

elements.continueBtn.addEventListener('click', () => {
    appState.playerName = elements.playerNameInput.value.trim();
    showToast(`¡Hola, ${appState.playerName}! Elige crear o unirte a una sala.`);
});

elements.createRoomBtn.addEventListener('click', () => {
    appState.playerName = elements.playerNameInput.value.trim();

    window.socketHandler.createRoom(appState.playerName, (response) => {
        if (response.success) {
            appState.roomCode = response.room.code;
            appState.players = response.room.players;
            appState.config = response.room.config;

            updateLobby();
            showScreen('lobby');
            showToast('¡Sala creada con éxito!');
        } else {
            showToast('Error al crear la sala: ' + response.error);
        }
    });
});

elements.joinRoomBtn.addEventListener('click', () => {
    elements.joinModal.classList.add('active');
    elements.roomCodeInput.value = '';
    elements.roomCodeInput.focus();
});

elements.cancelJoinBtn.addEventListener('click', () => {
    elements.joinModal.classList.remove('active');
});

elements.confirmJoinBtn.addEventListener('click', () => {
    const roomCode = elements.roomCodeInput.value.trim().toUpperCase();

    if (roomCode.length !== 6) {
        showToast('El código debe tener 6 caracteres');
        return;
    }

    appState.playerName = elements.playerNameInput.value.trim();

    window.socketHandler.joinRoom(roomCode, appState.playerName, (response) => {
        if (response.success) {
            appState.roomCode = response.room.code;
            appState.players = response.room.players;
            appState.config = response.room.config;

            elements.joinModal.classList.remove('active');
            updateLobby();
            showScreen('lobby');
            showToast('¡Te has unido a la sala!');
        } else {
            showToast('Error: ' + response.error);
        }
    });
});

elements.roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.confirmJoinBtn.click();
    }
});

// ========== Pantalla de Lobby ==========
function updateLobby() {
    elements.roomCodeDisplay.textContent = appState.roomCode;
    updatePlayersList();
    elements.impostorCountInput.value = appState.config.impostorCount;
    elements.includeHintInput.checked = appState.config.includeHint;

    if (window.socketHandler.isHost) {
        elements.gameConfig.style.display = 'block';
    } else {
        elements.gameConfig.style.display = 'none';
    }
}

function updatePlayersList() {
    elements.playerCount.textContent = `(${appState.players.length})`;
    elements.playersList.innerHTML = '';

    const myId = window.socketHandler.getSocketId();

    appState.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';

        const avatar = document.createElement('div');
        avatar.className = 'player-avatar';
        avatar.textContent = getInitials(player.name);

        const info = document.createElement('div');
        info.className = 'player-info';

        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = player.name;

        const badges = document.createElement('div');
        badges.className = 'player-badges';

        if (player.id === window.socketHandler.currentRoom || appState.players[0].id === player.id) {
            const hostBadge = document.createElement('span');
            hostBadge.className = 'badge badge-host';
            hostBadge.textContent = 'HOST';
            badges.appendChild(hostBadge);
        }

        if (player.friends && player.friends.includes(myId)) {
            const friendBadge = document.createElement('span');
            friendBadge.className = 'badge badge-friend';
            friendBadge.textContent = 'AMIGO';
            badges.appendChild(friendBadge);
        }

        info.appendChild(name);
        info.appendChild(badges);

        playerItem.appendChild(avatar);
        playerItem.appendChild(info);

        if (player.id !== myId && (!player.friends || !player.friends.includes(myId))) {
            const addFriendBtn = document.createElement('button');
            addFriendBtn.className = 'add-friend-btn';
            addFriendBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
            addFriendBtn.title = 'Agregar como amigo';
            addFriendBtn.addEventListener('click', () => {
                window.socketHandler.addFriend(player.id);
            });
            playerItem.appendChild(addFriendBtn);
        }

        elements.playersList.appendChild(playerItem);
    });
}

document.querySelectorAll('.btn-number').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        let value = parseInt(input.value);

        if (action === 'increase') {
            value = Math.min(value + 1, parseInt(input.max));
        } else {
            value = Math.max(value - 1, parseInt(input.min));
        }

        input.value = value;
        appState.config.impostorCount = value;
        window.socketHandler.updateConfig(appState.config);
    });
});

elements.includeHintInput.addEventListener('change', () => {
    appState.config.includeHint = elements.includeHintInput.checked;
    window.socketHandler.updateConfig(appState.config);
});

elements.copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(appState.roomCode).then(() => {
        showToast('¡Código copiado!');
    });
});

elements.shareLinkBtn.addEventListener('click', () => {
    const link = `${window.location.origin}?room=${appState.roomCode}`;

    if (navigator.share) {
        navigator.share({
            title: 'Únete a mi partida de Impostor',
            text: `¡Únete a mi sala! Código: ${appState.roomCode}`,
            url: link
        }).catch(() => {
            navigator.clipboard.writeText(link);
            showToast('¡Enlace copiado!');
        });
    } else {
        navigator.clipboard.writeText(link);
        showToast('¡Enlace copiado!');
    }
});

elements.startGameBtn.addEventListener('click', () => {
    window.socketHandler.startGame((response) => {
        if (!response.success) {
            showToast('Error: ' + response.error);
        }
    });
});

elements.leaveRoomBtn.addEventListener('click', () => {
    location.reload();
});

// ========== Pantalla de Revelación (SIMPLIFICADA - SIN CORTINA) ==========
function initRevealScreen(assignment, turnOrder, currentTurn) {
    appState.assignment = assignment;
    appState.turnOrder = turnOrder;
    appState.currentTurn = currentTurn;

    if (assignment.isImpostor) {
        elements.wordDisplay.innerHTML = `
            <div class="impostor-icon">🎭</div>
            <div class="impostor-text">ERES EL IMPOSTOR</div>
        `;
        elements.wordDisplay.classList.add('impostor');

        if (assignment.hint) {
            elements.hintDisplay.innerHTML = `💡 Pista: <strong>${assignment.hint}</strong>`;
            elements.hintDisplay.style.display = 'block';
        } else {
            elements.hintDisplay.style.display = 'none';
        }
    } else {
        elements.wordDisplay.textContent = assignment.word;
        elements.wordDisplay.classList.remove('impostor');
        elements.hintDisplay.style.display

            = 'none';
    }

    showScreen('reveal');
}

// Botón listo
elements.readyBtn.addEventListener('click', () => {
    window.socketHandler.wordRevealed();
});

// ========== Pantalla de Juego ==========
function initGameScreen() {
    showScreen('game');
    updateTurnOrder();
    updateCurrentTurn(appState.currentTurn);
}

function updateTurnOrder() {
    elements.turnOrderList.innerHTML = '';

    appState.turnOrder.forEach((player, index) => {
        const turnItem = document.createElement('div');
        turnItem.className = 'turn-item';
        turnItem.dataset.playerId = player.id;

        const turnNumber = document.createElement('div');
        turnNumber.className = 'turn-number';
        turnNumber.textContent = index + 1;

        const playerName = document.createElement('div');
        playerName.className = 'player-name';
        playerName.textContent = player.name;

        turnItem.appendChild(turnNumber);
        turnItem.appendChild(playerName);

        elements.turnOrderList.appendChild(turnItem);
    });
}

function updateCurrentTurn(player) {
    appState.currentTurn = player;
    elements.currentTurnName.textContent = player.name;

    document.querySelectorAll('.turn-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.playerId === player.id) {
            item.classList.add('active');
        }
    });

    const isMyTurn = player.id === window.socketHandler.getSocketId();
    elements.chatInput.disabled = !isMyTurn;
    elements.sendChatBtn.disabled = !isMyTurn;

    if (isMyTurn) {
        elements.chatInput.focus();
        showToast('¡Es tu turno!');
    }
}

function addChatMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    const sender = document.createElement('div');
    sender.className = 'sender';
    sender.textContent = message.playerName;

    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = message.message;

    messageDiv.appendChild(sender);
    messageDiv.appendChild(text);

    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    if (!message) return;

    window.socketHandler.sendChatMessage(message, (response) => {
        if (response.success) {
            elements.chatInput.value = '';
        } else {
            showToast('Error: ' + response.error);
        }
    });
}

elements.sendChatBtn.addEventListener('click', sendChatMessage);

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// ========== Eventos de Socket ==========
window.addEventListener('player-joined', (e) => {
    appState.players = e.detail.players;
    updatePlayersList();
    showToast(`${e.detail.player.name} se ha unido`);
});

window.addEventListener('player-left', (e) => {
    appState.players = e.detail.players;
    updatePlayersList();
    showToast('Un jugador se ha ido');
});

window.addEventListener('config-updated', (e) => {
    appState.config = e.detail;
    elements.impostorCountInput.value = e.detail.impostorCount;
    elements.includeHintInput.checked = e.detail.includeHint;
});

window.addEventListener('word-assignment', (e) => {
    initRevealScreen(e.detail.assignment, e.detail.turnOrder, e.detail.currentTurn);
});

window.addEventListener('chat-message', (e) => {
    addChatMessage(e.detail);
});

window.addEventListener('turn-changed', (e) => {
    updateCurrentTurn(e.detail);
});

window.addEventListener('friend-added', (e) => {
    showToast(`Ahora eres amigo de ${e.detail.name}`);
});

window.addEventListener('players-updated', (e) => {
    appState.players = e.detail;
    updatePlayersList();
});

// AUTO-CHAT cuando todos listos
window.addEventListener('all-players-ready', () => {
    initGameScreen();
    showToast('¡Todos listos! Que comience el juego');
});

// ========== Inicialización ==========
const urlParams = new URLSearchParams(window.location.search);
const roomCodeFromUrl = urlParams.get('room');

if (roomCodeFromUrl) {
    elements.roomCodeInput.value = roomCodeFromUrl;
    showToast('Has recibido una invitación a una sala');
}
