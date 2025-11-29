// Counter logic for ready buttons - ADD TO APP.JS

// Listen for ready status updates (reveal screen)
window.socketHandler.socket.on('ready-status-update', (data) => {
    const readyCountEl = document.getElementById('ready-count');
    if (readyCountEl) {
        readyCountEl.textContent = `(${data.ready}/${data.total})`;
    }
});
