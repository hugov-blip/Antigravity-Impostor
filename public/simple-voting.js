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
