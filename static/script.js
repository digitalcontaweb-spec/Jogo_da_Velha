const socket = io();
let myRole = null, myName = null, currentRoom = null, myTurn = false, countdown = null, timeLeft = 15;

// CONTROLE DA ANIMAÇÃO (Garante 5 segundos ou clique)
function skipIntro() {
    const intro = document.getElementById('intro');
    if (intro) intro.style.display = 'none';
    document.getElementById('setup').style.display = 'flex';
}

window.onload = () => { 
    // Removido sessionStorage temporariamente para você testar a animação sempre
    setTimeout(skipIntro, 5000); 
};

function showRules() {
    myName = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    if(myName && currentRoom) {
        document.getElementById('setup').style.display = 'none';
        document.getElementById('rules-modal').style.display = 'flex';
    }
}

function joinGame() {
    socket.emit('join', { name: myName, room: currentRoom });
    socket.emit('player_ready', { name: myName, room: currentRoom });
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
}

function startTimer() {
    clearInterval(countdown);
    timeLeft = 15;
    document.getElementById('timeLeft').innerText = timeLeft;
    countdown = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) document.getElementById('timeLeft').innerText = timeLeft;
        if (timeLeft <= 0) clearInterval(countdown);
    }, 1000);
}

socket.on('update_all', (data) => {
    // Tabuleiro e Cores
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

    // Nomes e Placar
    document.getElementById('nameX').innerText = data.players['X'] || '---';
    document.getElementById('nameO').innerText = data.players['O'] || '---';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    if (data.winner) {
        clearInterval(countdown);
        document.getElementById('result-message').innerText = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        // Sincronismo de Jogadores
        if (data.ready_count >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
            // Cronômetro inicia apenas após o primeiro movimento
            if (data.started) startTimer();
            else document.getElementById('timeLeft').innerText = "15";
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE...";
        }
    }
});

function move(idx) { if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom }); }
function handleChoice(a) { socket.emit(a === 'keep' ? 'reset_game' : 'quit_game', { room: currentRoom }); }
socket.on('force_quit_all', () => { window.location.reload(); });
socket.on('assign_role', (data) => { 
    myRole = data.role; 
    document.getElementById('myBadge').innerText = `${data.name} [${myRole}]`;
});
