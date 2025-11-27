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
