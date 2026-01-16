const socket = io();
let myRole = null, currentRoom = null, myTurn = false, countdown = null, timeLeft = 15;

// Controle da Abertura
window.onload = () => {
    const audio = document.getElementById('introSound');
    audio.play().catch(() => console.log("Som aguardando interação"));
    setTimeout(() => { skipIntro(); }, 5000); // Pula automático após 5s
};

function skipIntro() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('setup').style.display = 'block';
}

function showRules() {
    const n = document.getElementById('nameInput').value;
    const r = document.getElementById('roomInput').value;
    if(n && r) document.getElementById('rules-modal').style.display = 'flex';
}

function joinGame() {
    const name = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    socket.emit('join', { name: name, room: currentRoom });
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';
}

function startTimer() {
    clearInterval(countdown);
    timeLeft = 15;
    document.getElementById('timeLeft').innerText = timeLeft;
    countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            if (myTurn) socket.emit('timeout_punishment', { room: currentRoom, role: myRole });
        }
    }, 1000);
}

socket.on('assign_role', (data) => {
    myRole = data.role;
    document.getElementById('myBadge').innerText = `${data.name} [${myRole}]`;
});

socket.on('update_all', (data) => {
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#f85149';
    });

    document.getElementById('nameX').innerText = data.players['X'] || 'AGUARDANDO...';
    document.getElementById('nameO').innerText = data.players['O'] || 'AGUARDANDO...';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    if (data.winner) {
        clearInterval(countdown);
        document.getElementById('result-overlay').style.display = 'flex';
        document.getElementById('result-message').innerText = data.winner === 'Velha' ? "EMPATE!" : "VENCEU!";
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
        
        // MODIFICAÇÃO: Só inicia o timer se o jogo já tiver começado (1ª jogada feita)
        if (data.started && data.players['X'] && data.players['O']) {
            startTimer();
        } else {
            document.getElementById('timeLeft').innerText = "15"; // Fica parado em 15s até a 1ª jogada
        }
    }
});

function move(idx) {
    if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom });
}

function handleChoice(a) {
    if (a === 'keep') socket.emit('reset_game', { room: currentRoom });
    else window.location.reload();
}
