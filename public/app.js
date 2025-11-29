// app.js - Lógica principal del cliente

// Estado de la aplicación
const appState = {
    currentScreen: 'welcome',
    playerName: '',
    roomCode: '',
    players: [],
    config: { impostorCount: 1, includeHint: false },
    assignment: null,
    turnOrder: [],
    currentTurn: null,
    swipeReveal: null
};

// ========== Elementos del DOM ==========
const elements = {
    // Welcome screen
    welcomeScreen: document.getElementById('welcome-screen'),
    playerNameInput: document.getElementById('player-name-input'),
    continueBtn: document.getElementById('continue-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),

    // Lobby screen
    lobbyScreen: document.getElementById('lobby-screen'),
    roomCodeDisplay: document.getElementById('room-code'),
    copyCodeBtn: document.getElementById('copy-code-btn'),
    shareLinkBtn: document.getElementById('share-link-btn'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    gameConfig: document.getElementById('game-config'),
    impostorCountInput: document.getElementById('impostor-count'),
    includeHintInput: document.getElementById('include-hint'),
    startGameBtn: document.getElementById('start-game-btn'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),

    // Reveal screen
    revealScreen: document.getElementById('reveal-screen'),
    revealCurtain: document.getElementById('reveal-curtain'),
    wordDisplay: document.getElementById('word-display'),
    hintDisplay: document.getElementById('hint-display'),
    readyBtn: document.getElementById('ready-btn'),

    // Game screen
    gameScreen: document.getElementById('game-screen'),
    currentTurnName: document.getElementById('current-turn-name'),
    turnOrderList: document.getElementById('turn-order-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat-btn'),

    // Modal
    joinModal: document.getElementById('join-modal'),
    roomCodeInput: document.getElementById('room-code-input'),
    cancelJoinBtn: document.getElementById('cancel-join-btn'),
    confirmJoinBtn: document.getElementById('confirm-join-btn'),

    // Toast
    toast: document.getElementById('toast')
};

// ========== Funciones de Utilidad ==========
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const screen = document.getElementById(`${screenName}-screen`);
    if (screen) {
        screen.classList.add('active');
        appState.currentScreen = screenName;
    }
}

function showToast(message, duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// ========== Pantalla de Bienvenida ==========
elements.playerNameInput.addEventListener('input', (e) => {
    const name = e.target.value.trim();
    const isValid = name.length >= 2;

    elements.continueBtn.disabled = !isValid;
    elements.createRoomBtn.disabled = !isValid;
    elements.joinRoomBtn.disabled = !isValid;
});

elements.playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !elements.continueBtn.disabled) {
        elements.continueBtn.click();
    }
});

elements.continueBtn.addEventListener('click', () => {
    appState.playerName = elements.playerNameInput.value.trim();
    // El botón de continuar simplemente habilita las opciones
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
    // Actualizar código de sala
    elements.roomCodeDisplay.textContent = appState.roomCode;

    // Actualizar lista de jugadores
    updatePlayersList();

    // Actualizar selector de impostores
    document.querySelectorAll('.btn-impostor-select').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.count) === appState.config.impostorCount) {
            btn.classList.add('active');
        }
    });

    // Mostrar/ocultar panel de configuración según si es host
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

        // Badge de host
        if (player.id === window.socketHandler.currentRoom ||
            appState.players[0].id === player.id) {
            const hostBadge = document.createElement('span');
            hostBadge.className = 'badge badge-host';
            hostBadge.textContent = 'HOST';
            badges.appendChild(hostBadge);
        }

        // Badge de amigo
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

        // Botón agregar amigo (si no es el usuario actual y no son amigos)
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

// Impostor selector buttons
document.querySelectorAll('.btn-impostor-select').forEach(btn => {
    btn.addEventListener('click', () => {
        const count = parseInt(btn.dataset.count);
        appState.config.impostorCount = count;

        // Update UI
        document.querySelectorAll('.btn-impostor-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Notify server
        window.socketHandler.updateConfig(appState.config);
    });
});

// Copiar código
elements.copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(appState.roomCode).then(() => {
        showToast('¡Código copiado!');
    });
});

// Compartir enlace
elements.shareLinkBtn.addEventListener('click', () => {
    const link = `${window.location.origin}?room=${appState.roomCode}`;

    if (navigator.share) {
        navigator.share({
            title: 'Únete a mi partida de Impostor',
            text: `¡Únete a mi sala! Código: ${appState.roomCode}`,
            url: link
        }).catch(() => {
            // Si falla, copiar al portapapeles
            navigator.clipboard.writeText(link);
            showToast('¡Enlace copiado!');
        });
    } else {
        navigator.clipboard.writeText(link);
        showToast('¡Enlace copiado!');
    }
});

// Iniciar juego
elements.startGameBtn.addEventListener('click', () => {
    window.socketHandler.startGame((response) => {
        if (!response.success) {
            showToast('Error: ' + response.error);
        }
    });
});

// Salir de la sala
elements.leaveRoomBtn.addEventListener('click', () => {
    location.reload();
});

// ========== Pantalla de Revelación ==========
function initRevealScreen(assignment, turnOrder, currentTurn) {
    appState.assignment = assignment;
    appState.turnOrder = turnOrder;
    appState.currentTurn = currentTurn;

    // Configurar contenido
    if (assignment.isImpostor) {
        elements.wordDisplay.innerHTML = '🎭<br>ERES EL<br>IMPOSTOR';
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
        elements.hintDisplay.style.display = 'none';
    }

    // Inicializar swipe
    if (appState.swipeReveal) {
        appState.swipeReveal.destroy();
    }

    appState.swipeReveal = new SwipeReveal(elements.revealCurtain);

    showScreen('reveal');
}

// Botón listo
elements.readyBtn.addEventListener('click', () => {
    window.socketHandler.wordRevealed();
    // Esperar a que todos estén listos
    elements.readyBtn.addEventListener('click', () => {
        window.socketHandler.wordRevealed();
        // Esperar a que todos estén listos
    });
});
// Evento de palabra revelada
window.addEventListener('word-revealed', () => {
    elements.readyBtn.style.display = 'inline-flex';
});

// ========== Pantalla de Juego ==========
function initGameScreen() {
    showScreen('game');

    // Configurar orden de turnos
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

    // Actualizar visualización
    document.querySelectorAll('.turn-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.playerId === player.id) {
            item.classList.add('active');
        }
    });

    // Habilitar/deshabilitar chat
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

// Enviar mensaje
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
// Todos listos - cambiar a pantalla de juego
window.addEventListener('all-players-ready', () => {
    initGameScreen();
    showToast('¡Todos listos! Que comience el juego');
});
// ========== Inicialización ==========
// Verificar si hay código de sala en la URL
const urlParams = new URLSearchParams(window.location.search);
const roomCodeFromUrl = urlParams.get('room');

if (roomCodeFromUrl) {
    elements.roomCodeInput.value = roomCodeFromUrl;
    // Esperar a que el usuario ingrese su nombre
    showToast('Has recibido una invitación a una sala');
}
// Voting event handlers for app.js - ADD TO APP.JS BEFORE CLOSING

// ===== VOTING SYSTEM EVENT LISTENERS =====
window.addEventListener('voting-start', (e) => {
    const { players } = e.detail;
    console.log('Voting started', players);

    // Show voting section
    const votingSection = document.getElementById('voting-section');
    if (votingSection) {
        votingSection.style.display = 'block';
    }

    const votingResults = document.getElementById('voting-results');
    if (votingResults) {
        votingResults.style.display = 'none';
    }

    // Create voting buttons
    const votingButtons = document.getElementById('voting-buttons');
    if (!votingButtons) return;

    votingButtons.innerHTML = '';

    // Button for each player
    players.forEach(player => {
        if (player.id !== window.socketHandler.getSocketId()) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-vote';
            btn.innerHTML = `<i class="fas fa-user"></i> ${player.name}`;
            btn.addEventListener('click', () => {
                window.socketHandler.submitVote(player.id);
                votingButtons.innerHTML = '<p>✅ Voto enviado</p>';
            });
            votingButtons.appendChild(btn);
        }
    });

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn btn-vote btn-vote-skip';
    skipBtn.innerHTML = '<i class="fas fa-forward"></i> No Eliminar - Continuar';
    skipBtn.addEventListener('click', () => {
        window.socketHandler.submitVote('skip');
        votingButtons.innerHTML = '<p>✅ Voto enviado</p>';
    });
    votingButtons.appendChild(skipBtn);
});

window.addEventListener('player-eliminated', (e) => {
    const { player, wasImpostor } = e.detail;
    console.log('Player eliminated', player, wasImpostor);

    // Hide voting, show results
    const votingSection = document.getElementById('voting-section');
    if (votingSection) votingSection.style.display = 'none';

    const votingResults = document.getElementById('voting-results');
    if (!votingResults) return;

    votingResults.style.display = 'block';

    const resultsContent = document.getElementById('results-content');
    if (resultsContent) {
        resultsContent.innerHTML = `
            <h4>${player.name} ha sido eliminado</h4>
            <p class="${wasImpostor ? 'impostor-eliminated' : 'crew-eliminated'}">
                ${wasImpostor ? '🎭 ¡ERA EL IMPOSTOR!' : '😔 NO era el impostor'}
            </p>
        `;
    }

    setTimeout(() => {
        if (votingResults) votingResults.style.display = 'none';
    }, 5000);
});

window.addEventListener('game-over', (e) => {
    const { winner, reason } = e.detail;
    console.log('Game over', winner, reason);
    showToast(`¡Juego Terminado! Ganaron: ${winner === 'crew' ? 'LOS BUENOS' : 'EL IMPOSTOR'}`);
    setTimeout(() => {
        alert(`¡Juego Terminado!\\n\\nGanaron: ${winner === 'crew' ? 'LOS BUENOS' : 'EL IMPOSTOR'}\\n${reason}`);
    }, 1000);
});

window.addEventListener('voting-skip', () => {
    console.log('Voting skipped');
    showToast('Se continuará sin eliminar a nadie');
    const votingSection = document.getElementById('voting-section');
    if (votingSection) votingSection.style.display = 'none';
});
// ===== SIMPLE VOTING SYSTEM - BUTTON BASED =====

let readyToVoteStatus = false;

// Ready to vote button
const readyToVoteBtn = document.getElementById('ready-to-vote-btn');
if (readyToVoteBtn) {
    readyToVoteBtn.addEventListener('click', () => {
        if (!readyToVoteStatus) {
            readyToVoteStatus = true;
            readyToVoteBtn.classList.add('ready');
            window.socketHandler.socket.emit('player-ready-vote');
            showToast('Esperando a que todos estén listos...');
        }
    });
}

// Listen for vote readiness updates
window.socketHandler.socket.on('vote-ready-status', (data) => {
    const readyCountEl = document.getElementById('ready-vote-count');
    if (readyCountEl) {
        readyCountEl.textContent = `(${data.ready}/${data.total})`;
    }
});

// Override voting-start to use light UI
window.addEventListener('voting-start', (e) => {
    const { players } = e.detail;
    console.log('Voting started', players);

    // Reset ready status
    readyToVoteStatus = false;
    if (readyToVoteBtn) {
        readyToVoteBtn.classList.remove('ready');
    }

    // Hide trigger, show voting
    document.querySelector('.voting-trigger-card').style.display = 'none';
    document.getElementById('voting-section').style.display = 'block';
    document.getElementById('voting-results').style.display = 'none';

    // Create voting buttons with light style
    const votingButtons = document.getElementById('voting-buttons');
    if (!votingButtons) return;

    votingButtons.innerHTML = '';

    // Button for each player
    players.forEach(player => {
        if (player.id !== window.socketHandler.getSocketId()) {
            const btn = document.createElement('button');
            btn.className = 'btn-vote';
            btn.innerHTML = `<i class="fas fa-user"></i> ${player.name}`;
            btn.addEventListener('click', () => {
                window.socketHandler.submitVote(player.id);
                votingButtons.innerHTML = '<p style="color: #000; font-size: 1.5rem; font-weight: 900;">✅ Voto enviado</p>';
            });
            votingButtons.appendChild(btn);
        }
    });

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-vote btn-vote-skip';
    skipBtn.innerHTML = '<i class="fas fa-forward"></i> No Eliminar - Continuar Jugando';
    skipBtn.addEventListener('click', () => {
        window.socketHandler.submitVote('skip');
        votingButtons.innerHTML = '<p style="color: #000; font-size: 1.5rem; font-weight: 900;">✅ Voto enviado</p>';
    });
    votingButtons.appendChild(skipBtn);
});

// Override player-eliminated to show trigger again
window.addEventListener('player-eliminated', (e) => {
    const { player, wasImpostor } = e.detail;
    console.log('Player eliminated', player, wasImpostor);

    // Show results
    document.getElementById('voting-section').style.display = 'none';
    document.getElementById('voting-results').style.display = 'block';

    const resultsContent = document.getElementById('results-content');
    if (resultsContent) {
        resultsContent.innerHTML = `
            <h4>${player.name} ha sido eliminado</h4>
            <p class="${wasImpostor ? 'impostor-eliminated' : 'crew-eliminated'}">
                ${wasImpostor ? '🎭 ¡ERA EL IMPOSTOR!' : '😔 NO era el impostor'}
            </p>
        `;
    }

    setTimeout(() => {
        document.getElementById('voting-results').style.display = 'none';
        document.querySelector('.voting-trigger-card').style.display = 'block';
    }, 5000);
});

// Override voting-skip to show trigger again
window.addEventListener('voting-skip', () => {
    console.log('Voting skipped');
    showToast('Se continuará sin eliminar a nadie');
    document.getElementById('voting-section').style.display = 'none';
    document.querySelector('.voting-trigger-card').style.display = 'block';
});
// Counter logic for ready buttons - ADD TO APP.JS

// Listen for ready status updates (reveal screen)
window.socketHandler.socket.on('ready-status-update', (data) => {
    const readyCountEl = document.getElementById('ready-count');
    if (readyCountEl) {
        readyCountEl.textContent = `(${data.ready}/${data.total})`;
    }
});
