const socket = io();
let myRole = null, currentRoom = null, myTurn = false, countdown = null, timeLeft = 15;

window.onload = () => { setTimeout(skipIntro, 5000); };
function skipIntro() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('setup').style.display = 'block';
}

function showRules() {
    if(document.getElementById('nameInput').value && document.getElementById('roomInput').value)
        document.getElementById('rules-modal').style.display = 'flex';
}

function joinGame() {
    const name = document.getElementById('nameInput').value;
    currentRoom = document.getElementById('roomInput').value;
    socket.emit('join', { name: name, room: currentRoom });
    socket.emit('player_ready', { room: currentRoom }); // Avisa que VOCÊ está pronto
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
        cells[i].style.color = (val === 'X') ? '#2ea043' : '#f85149';
    });

    document.getElementById('nameX').innerText = data.players['X'] || 'AGUARDANDO...';
    document.getElementById('nameO').innerText = data.players['O'] || 'AGUARDANDO...';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    if (data.winner) {
        clearInterval(countdown);
        document.getElementById('result-message').innerText = data.winner === 'Velha' ? "EMPATE!" : "VENCEU!";
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        // SÓ LIBERA O STATUS E TIMER SE OS DOIS TIVEREM CLICADO EM "ESTOU PRONTO"
        if (data.ready_count >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
            if (data.started) startTimer();
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE LER AS REGRAS...";
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
