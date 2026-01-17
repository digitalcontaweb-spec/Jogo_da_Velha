const socket = io();
let myRole = null, myName = null, currentRoom = null, myTurn = false, countdown = null, timeLeft = 15;

function skipIntro() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';
}
window.onload = () => { setTimeout(skipIntro, 5000); };

function showRules() {
    myName = document.getElementById('nameInput').value.trim();
    currentRoom = document.getElementById('roomInput').value.trim();
    if(myName && currentRoom) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('rules-modal').style.display = 'flex';
    }
}

function joinGame() {
    socket.emit('join', { name: myName, room: currentRoom });
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
}

function startTimer() {
    clearInterval(countdown);
    timeLeft = 15;
    document.getElementById('timeLeft').innerText = timeLeft;
    countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').innerText = (timeLeft >= 0) ? timeLeft : 0;
        if (timeLeft <= 0) clearInterval(countdown);
    }, 1000);
}

socket.on('assign_role', (data) => { 
    myRole = data.role; 
    document.getElementById('myBadge').innerText = `${data.name} [${myRole}]`;
});

socket.on('update_all', (data) => {
    // 1. Atualiza Tabuleiro
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

    // 2. Atualiza Nomes e Placar (Essencial para as imagens image_d59106)
    document.getElementById('nameX').innerText = data.players['X'] || 'AGUARDANDO...';
    document.getElementById('nameO').innerText = data.players['O'] || 'AGUARDANDO...';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    // 3. Verifica Vencedor
    if (data.winner) {
        clearInterval(countdown);
        document.getElementById('result-message').innerText = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        if (Object.keys(data.players).length >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `TURNO: ${data.players[data.turn]}`;
            if (data.started) startTimer();
            else { clearInterval(countdown); document.getElementById('timeLeft').innerText = "15"; }
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE...";
        }
    }
});

function move(idx) { 
    if (myTurn && myRole !== 'Espectador') {
        socket.emit('make_move', { index: idx, role: myRole, room: currentRoom }); 
    }
}

function handleChoice(a) { socket.emit(a === 'keep' ? 'reset_game' : 'quit_game', { room: currentRoom }); }
socket.on('force_quit_all', () => { window.location.reload(); });
