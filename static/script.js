const socket = io();
let myRole = null, currentRoom = null, myTurn = false, countdown = null;

// Só mostra a intro se for a primeira vez na sessão
if (!sessionStorage.getItem('introPlayed')) {
    window.onload = () => { 
        setTimeout(() => {
            document.getElementById('intro').style.display = 'none';
            document.getElementById('setup').style.display = 'flex';
            sessionStorage.setItem('introPlayed', 'true');
        }, 5000);
    };
} else {
    window.onload = () => {
        document.getElementById('intro').style.display = 'none';
        document.getElementById('setup').style.display = 'flex';
    };
}

function skipIntro() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('setup').style.display = 'flex';
    sessionStorage.setItem('introPlayed', 'true');
}

function showRules() {
    if(document.getElementById('nameInput').value && document.getElementById('roomInput').value)
        document.getElementById('rules-modal').style.display = 'flex';
}

function joinGame() {
    const name = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    socket.emit('join', { name: name, room: currentRoom });
    socket.emit('player_ready', { room: currentRoom });
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
}

socket.on('update_all', (data) => {
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

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
        document.getElementById('status').innerText = data.ready_count >= 2 ? (myTurn ? ">> SUA VEZ <<" : `AGUARDANDO OPONENTE`) : "AGUARDANDO CONEXÃO...";
    }
});

function handleChoice(a) {
    if (a === 'keep') socket.emit('reset_game', { room: currentRoom });
    else socket.emit('quit_game', { room: currentRoom });
}

// Quando qualquer um sai, todos voltam para o login (sem intro)
socket.on('force_quit_all', () => {
    window.location.reload();
});

function move(idx) {
    if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom });
}
