const socket = io();
let myRole = null, myName = null, currentRoom = null, myTurn = false;

// Garante que a animação dure 5 segundos
window.onload = () => { 
    setTimeout(() => {
        document.getElementById('intro').style.display = 'none';
        document.getElementById('setup').style.display = 'flex';
    }, 5000); 
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

socket.on('assign_role', (data) => { myRole = data.role; });

socket.on('update_all', (data) => {
    // Tabuleiro
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

    // Placar
    document.getElementById('nameX').innerText = data.players['X'] || '---';
    document.getElementById('nameO').innerText = data.players['O'] || '---';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    // Vencedor
    if (data.winner) {
        const msg = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        document.getElementById('status').innerText = (data.ready_count >= 2) ? 
            (myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`) : "AGUARDANDO OPONENTE...";
    }
});

function move(idx) { if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom }); }
function handleChoice(a) { socket.emit(a === 'keep' ? 'reset_game' : 'quit_game', { room: currentRoom }); }
socket.on('force_quit_all', () => { window.location.reload(); });
