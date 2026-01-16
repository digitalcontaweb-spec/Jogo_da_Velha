const socket = io();
let myRole = null, myName = null, currentRoom = null, myTurn = false;

// Garante que a intro apareça por 4 segundos
window.onload = () => { 
    setTimeout(() => {
        document.getElementById('intro').style.display = 'none';
        document.getElementById('setup').style.display = 'flex';
    }, 4000); 
};

function showRules() {
    myName = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    if(myName && currentRoom) document.getElementById('rules-modal').style.display = 'flex';
}

function joinGame() {
    socket.emit('join', { name: myName, room: currentRoom });
    socket.emit('player_ready', { name: myName, room: currentRoom });
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
        const msg = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        // SÓ LIBERA SE HOUVER 2 JOGADORES DIFERENTES PRONTOS
        if (data.ready_count >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE...";
        }
    }
});

function move(idx) { if (myTurn) socket.emit('make_move', { index: idx, role: myRole, room: currentRoom }); }
function handleChoice(a) { socket.emit(a === 'keep' ? 'reset_game' : 'quit_game', { room: currentRoom }); }
socket.on('force_quit_all', () => { window.location.reload(); });
socket.on('assign_role', (data) => { myRole = data.role; });
