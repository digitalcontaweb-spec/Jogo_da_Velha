const socket = io();
let myRole = null;
let currentRoom = null;
let myTurn = false;
let countdown = null;
let timeLeft = 15;

function joinGame() {
    const name = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    if (name && currentRoom) {
        socket.emit('join', { name: name, room: currentRoom });
        document.getElementById('setup').style.display = 'none';
        document.getElementById('game').style.display = 'block';
    }
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
            if (myTurn) {
                // Se o tempo acabou e é minha vez, aviso o servidor da punição
                socket.emit('timeout_punishment', { room: currentRoom, role: myRole });
            }
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

    document.getElementById('nameX').innerText = data.players['X'] || 'WAITING...';
    document.getElementById('nameO').innerText = data.players['O'] || 'WAITING...';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    if (data.winner) {
        clearInterval(countdown);
        document.getElementById('result-message').innerText = data.winner === 'Velha' ? "EMPATE!" : `${data.players[data.winner]} VENCEU!`;
        document.getElementById('result-overlay').style.display = 'flex';
        myTurn = false;
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        const nVez = data.players[data.turn] || 'OPONENTE';
        document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${nVez}`;
        
        // Reinicia o timer toda vez que a vez muda
        startTimer();
    }
});

function move(idx) {
    if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom });
}

function handleChoice(action) {
    if (action === 'keep') socket.emit('reset_game', { room: currentRoom });
    else socket.emit('full_reset', { room: currentRoom });
}

socket.on('force_setup', () => { window.location.reload(); });