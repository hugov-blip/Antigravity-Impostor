// Voting socket methods - ADD TO socket-handler.js SocketHandler class

// Send chat message (REPLACE existing sendChatMessage if it exists)
sendChatMessage(message, callback = () => { }) {
    this.socket.emit('send-chat-message', message, callback);
}

// Submit vote
submitVote(targetId, callback = () => { }) {
    this.socket.emit('submit-vote', targetId, callback);
}

// Voting socket event listeners - ADD BEFORE connection event listener ends

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

this.socket.on('voting-tiebreak', (data) => {
    // For now, just log - could implement special UI later
    console.log('Tie-break vote needed', data);
});
