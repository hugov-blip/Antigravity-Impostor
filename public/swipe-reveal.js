// swipe-reveal.js - Mecánica de deslizar para revelar

class SwipeReveal {
    constructor(curtainElement) {
        this.curtain = curtainElement;
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
        this.revealed = false;
        this.threshold = -200; // Píxeles que hay que deslizar hacia arriba

        this.init();
    }

    init() {
        // Event listeners para touch
        this.curtain.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.curtain.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        this.curtain.addEventListener('touchend', this.handleEnd.bind(this));

        // Event listeners para mouse (para testing en desktop)
        this.curtain.addEventListener('mousedown', this.handleStart.bind(this));
        this.curtain.addEventListener('mousemove', this.handleMove.bind(this));
        this.curtain.addEventListener('mouseup', this.handleEnd.bind(this));
        this.curtain.addEventListener('mouseleave', this.handleEnd.bind(this));
    }

    handleStart(e) {
        if (this.revealed) return;

        this.isDragging = true;
        this.curtain.classList.add('grabbing');

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        this.startY = clientY;
        this.currentY = 0;
    }

    handleMove(e) {
        if (!this.isDragging || this.revealed) return;

        e.preventDefault();

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - this.startY;

        // Solo permitir deslizar hacia arriba
        if (deltaY < 0) {
            this.currentY = deltaY;

            // Limitar el movimiento
            const translateY = Math.max(deltaY, this.threshold);
            this.curtain.style.transform = `translateY(${translateY}px)`;
        }
    }

    handleEnd(e) {
        if (!this.isDragging || this.revealed) return;

        this.isDragging = false;
        this.curtain.classList.remove('grabbing');

        // Verificar si alcanzó el threshold
        if (this.currentY <= this.threshold) {
            this.reveal();
        } else {
            // Volver a la posición original
            this.curtain.style.transform = 'translateY(0)';
        }
    }

    reveal() {
        this.revealed = true;

        // Animar la cortina completamente hacia arriba
        this.curtain.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        this.curtain.style.transform = 'translateY(-100%)';

        // Vibración háptica si está disponible
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        // Emitir evento personalizado
        const event = new CustomEvent('word-revealed');
        window.dispatchEvent(event);
    }

    reset() {
        this.revealed = false;
        this.curtain.style.transition = 'none';
        this.curtain.style.transform = 'translateY(0)';

        // Forzar reflow
        this.curtain.offsetHeight;
    }

    destroy() {
        this.curtain.removeEventListener('touchstart', this.handleStart);
        this.curtain.removeEventListener('touchmove', this.handleMove);
        this.curtain.removeEventListener('touchend', this.handleEnd);
        this.curtain.removeEventListener('mousedown', this.handleStart);
        this.curtain.removeEventListener('mousemove', this.handleMove);
        this.curtain.removeEventListener('mouseup', this.handleEnd);
        this.curtain.removeEventListener('mouseleave', this.handleEnd);
    }
}

// Exportar para uso global
window.SwipeReveal = SwipeReveal;
