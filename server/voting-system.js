// voting-system.js - Sistema de votación para Impostor Game

class VotingSystem {
    /**
     * Agrega propiedades de votación al gameState
     */
    static initializeVotingState(gameState) {
        gameState.currentRound = 1;
        gameState.roundMessages = new Set();
        gameState.votingActive = false;
        gameState.votes = new Map();
        gameState.eliminatedPlayers = new Set();
        gameState.spectators = new Set();
        return gameState;
    }

    /**
     * Rastrea que un jugador ha enviado mensaje en la ronda actual
     * @returns {boolean} true si la ronda está completa
     */
    static trackRoundMessage(gameState, playerId) {
        gameState.roundMessages.add(playerId);

        // Contar jugadores activos (no eliminados, no espectadores)
        const activePlayers = gameState.turnOrder.filter(p =>
            !gameState.eliminatedPlayers.has(p.id) &&
            !gameState.spectators.has(p.id)
        );

        return gameState.roundMessages.size >= activePlayers.length;
    }

    /**
     * Inicia fase de votación
     */
    static startVoting(gameState) {
        gameState.votingActive = true;
        gameState.votes.clear();
    }

    /**
     * Registra un voto
     * @returns {boolean} true si todos han votado
     */
    static submitVote(gameState, playerId, targetId) {
        if (!gameState.votingActive) return false;

        gameState.votes.set(playerId, targetId);

        // Contar jugadores activos que pueden votar
        const activePlayers = gameState.turnOrder.filter(p =>
            !gameState.eliminatedPlayers.has(p.id) &&
            !gameState.spectators.has(p.id)
        );

        return gameState.votes.size >= activePlayers.length;
    }

    /**
     * Calcula resultados de votación con reglas de empate
     * @returns {Object} resultado con: winner, votes, tieBreak, tied[]
     */
    static calculateVoteResults(gameState) {
        const voteCounts = new Map();

        // Contar votos
        for (const [voter, target] of gameState.votes) {
            voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
        }

        // Ignorar votos únicos
        const validVotes = Array.from(voteCounts.entries()).filter(([_, count]) => count > 1);

        if (validVotes.length === 0) {
            // No hay votos válidos, continuar
            return { winner: 'skip', votes: voteCounts, tieBreak: false };
        }

        const maxVotes = Math.max(...validVotes.map(([_, count]) => count));
        const tied = validVotes.filter(([_, count]) => count === maxVotes);

        // Un ganador claro
        if (tied.length === 1) {
            return { winner: tied[0][0], votes: voteCounts, tieBreak: false };
        }

        // Empate: si 'skip' está en el empate, gana 'skip'
        if (tied.find(([target]) => target === 'skip')) {
            return { winner: 'skip', votes: voteCounts, tieBreak: false };
        }

        // Empate entre 2 jugadores: repetir votación
        if (tied.length === 2 && !tied.find(([t]) => t === 'skip')) {
            return {
                winner: null,
                votes: voteCounts,
                tieBreak: true,
                tied: tied.map(([id]) => id)
            };
        }

        // Empate entre más de 2: continuar
        return { winner: 'skip', votes: voteCounts, tieBreak: false };
    }

    /**
     * Elimina un jugador del juego
     */
    static eliminatePlayer(gameState, playerId) {
        gameState.eliminatedPlayers.add(playerId);
        gameState.spectators.add(playerId);
    }

    /**
     * Verifica condiciones de victoria
     * @returns {string|null} 'crew', 'impostors', or null
     */
    static checkVictory(gameState) {
        // Encontrar impostores
        const impostors = gameState.assignments.filter(a => a.isImpostor);
        const impostorIds = new Set(impostors.map(a => a.playerId));

        // Contar impostores vivos
        const aliveImpostors = Array.from(impostorIds).filter(id =>
            !gameState.eliminatedPlayers.has(id)
        );

        // Si no hay impostores vivos, ganan los buenos
        if (aliveImpostors.length === 0) {
            return 'crew';
        }

        // Contar jugadores vivos total
        const alivePlayers = gameState.turnOrder.filter(p =>
            !gameState.eliminatedPlayers.has(p.id)
        );

        // Si solo quedan 2 jugadores y uno es impostor, gana el impostor
        if (alivePlayers.length === 2 && aliveImpostors.length === 1) {
            return 'impostors';
        }

        return null;
    }

    /**
     * Reinicia para nueva ronda
     */
    static resetRound(gameState) {
        gameState.roundMessages.clear();
        gameState.votingActive = false;
        gameState.votes.clear();
        gameState.currentRound++;
        gameState.currentTurnIndex = 0;
    }
}

module.exports = VotingSystem;
