const socket = io();
let myRole = null;
let myTurn = false;
let playerNames = { 'X': 'Aguardando...', 'O': 'Aguardando...' };

function joinGame() {
    const name = document.getElementById('nameInput').value;
    if (name) {
        socket.emit('join', { name: name });
        document.getElementById('setup').style.display = 'none';
        document.getElementById('game').style.display = 'block';
    }
}

socket.on('assign_role', (data) => {
    myRole = data.role;
});

socket.on('init_sync', (data) => {
    playerNames = data.names;
    updateUI(data);
});

socket.on('chat_msg', (data) => {
    // Exibe a mensagem de quem começa
    document.getElementById('status').innerText = data.msg;
    // Limpa a mensagem após 3 segundos para mostrar o turno
    setTimeout(() => { socket.emit('refresh_ui'); }, 3000);
});

socket.on('update_board', (data) => {
    playerNames = data.names;
    updateUI(data);
    
    if (data.winner_name) {
        setTimeout(() => {
            if (data.winner_name === 'Velha') {
                alert("Empate! Deu velha.");
            } else {
                alert("Parabéns! O jogador " + data.winner_name + " ganhou a partida!");
            }
            socket.emit('reset_game');
        }, 100);
    }
});

function updateUI(data) {
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#034530' : '#d9534f';
    });

    // Placar com nomes reais
    const nomeX = playerNames['X'] || 'Aguardando...';
    const nomeO = playerNames['O'] || 'Aguardando...';
    document.getElementById('scoreboardText').innerText = `${nomeX}: ${data.score.X} | ${nomeO}: ${data.score.O}`;

    myTurn = (data.turn === myRole);
    if (!data.winner_name) {
        const nomeVez = playerNames[data.turn] || data.turn;
        document.getElementById('status').innerText = myTurn ? `Sua vez, ${nomeX}!` : `Vez de: ${nomeVez}`;
    }
}

function move(idx) {
    if (myTurn) {
        socket.emit('make_move', { index: idx, role: myRole });
    }
}

// ... manter variáveis iniciais ...

socket.on('update_board', (data) => {
    updateUI(data);
    
    if (data.winner_name) {
        const msg = data.winner_name === 'Velha' ? "Empate! Deu velha." : `Parabéns! ${data.winner_name} ganhou!`;
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-screen').style.display = 'block';
    }
});

// Nova função para tratar o clique no botão de reiniciar
function confirmRestart(keepPlayers) {
    document.getElementById('result-screen').style.display = 'none';
    if (keepPlayers) {
        socket.emit('reset_game');
    } else {
        socket.emit('full_reset'); // Reseta tudo, inclusive nomes
    }
}

// Escuta o comando de reset total (volta para a tela de nomes)
socket.on('force_setup', () => {
    myRole = null;
    document.getElementById('game').style.display = 'none';
    document.getElementById('setup').style.display = 'block';
    document.getElementById('nameInput').value = '';
});