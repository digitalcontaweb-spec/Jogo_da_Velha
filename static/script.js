const socket = io();
let myRole = null, myName = null, currentRoom = null, myTurn = false, countdown = null, timeLeft = 15;

// Gestão de Intro para não repetir
if (!sessionStorage.getItem('introPlayed')) {
    window.onload = () => { 
        setTimeout(skipIntro, 4000); 
    };
} else {
    window.onload = () => { skipIntro(); };
}

function skipIntro() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('setup').style.display = 'flex';
    sessionStorage.setItem('introPlayed', 'true');
}

function showRules() {
    myName = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    if(myName && currentRoom) document.getElementById('rules-modal').style.display = 'flex';
}

function joinGame() {
    socket.emit('join', { name: myName, room: currentRoom });
    socket.emit('player_ready', { name: myName, room: currentRoom }); // Envia o nome para o set do servidor
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
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
            // Punição automática se for o turno
            // if (myTurn) socket.emit('timeout_punishment', { room: currentRoom, role: myRole });
        }
    }, 1000);
}

socket.on('assign_role', (data) => {
    myRole = data.role;
    document.getElementById('myBadge').innerText = `${data.name} [${myRole}]`;
});

socket.on('update_all', (data) => {
    // Atualiza tabuleiro
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

    // Atualiza Placar
    document.getElementById('nameX').innerText = data.players['X'] || '---';
    document.getElementById('nameO').innerText = data.players['O'] || '---';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    if (data.winner) {
        clearInterval(countdown);
        const msg = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        // LÓGICA DE STATUS REVISADA
        if (data.ready_count >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
            // Inicia o visual do cronômetro apenas se o jogo já tiver tido o primeiro lance
            if (data.started) startTimer(); 
            else document.getElementById('timeLeft').innerText = "15";
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE...";
        }
    }
});

function handleChoice(a) {
    if (a === 'keep') socket.emit('reset_game', { room: currentRoom });
    else socket.emit('quit_game', { room: currentRoom });
}

socket.on('force_quit_all', () => { window.location.reload(); });

function move(idx) {
    if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom });
}
