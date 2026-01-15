const socket = io(); // Conecta automaticamente ao servidor do Render
let myRole = null;
let currentRoom = null;
let myTurn = false;
let countdown = null;
let timeLeft = 15;

// Função para entrar na sala
function joinGame() {
    const name = document.getElementById('nameInput').value;
    const room = document.getElementById('roomInput').value;
    
    if (name && room) {
        currentRoom = room;
        // Envia os dados para o servidor
        socket.emit('join', { name: name, room: room });
        
        // Esconde a tela de login e mostra a arena
        document.getElementById('setup').style.display = 'none';
        document.getElementById('game').style.display = 'block';
    }
}

// Controle do Timer de 15 segundos
function startTimer() {
    clearInterval(countdown);
    timeLeft = 15;
    document.getElementById('timeLeft').innerText = timeLeft;
    
    countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            // Se o tempo acabar e for a minha vez, o servidor aplica a punição
            if (myTurn) {
                socket.emit('timeout_punishment', { room: currentRoom, role: myRole });
            }
        }
    }, 1000);
}

// Recebe a atribuição de quem você é (X ou O)
socket.on('assign_role', (data) => {
    myRole = data.role;
    // Atualiza o crachá no topo da tela (Corrige o erro de nomes vazios)
    document.getElementById('myBadge').innerText = `${data.name} [${myRole}]`;
});

// Atualização geral do estado do jogo (Tabuleiro, Placar e Vez)
socket.on('update_all', (data) => {
    const cells = document.querySelectorAll('.cell');
    
    // Atualiza o tabuleiro visualmente
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#f85149';
    });

    // Atualiza nomes e placar (Corrige o "..." que aparecia antes)
    document.getElementById('nameX').innerText = data.players['X'] || 'AGUARDANDO...';
    document.getElementById('nameO').innerText = data.players['O'] || 'AGUARDANDO...';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    // Lógica de Fim de Jogo
    if (data.winner) {
        clearInterval(countdown);
        const msg = data.winner === 'Velha' ? "EMPATE!" : `${data.players[data.winner]} VENCEU!`;
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-overlay').style.display = 'flex';
        myTurn = false;
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        // Exibe de quem é a vez
        const nomeDaVez = data.players[data.turn] || 'OPONENTE';
        document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${nomeDaVez}`;
        
        // Reinicia o cronômetro sempre que a vez muda
        startTimer();
    }
});

// Envia a jogada ao clicar em uma célula
function move(idx) {
    if (myTurn) {
        socket.emit('make_move', { 
            index: idx, 
            role: myRole, 
            room: currentRoom 
        });
    }
}

// Controle dos botões de Revanche ou Sair
function handleChoice(action) {
    if (action === 'keep') {
        socket.emit('reset_game', { room: currentRoom });
    } else {
        socket.emit('full_reset', { room: currentRoom });
    }
}

// Caso alguém reinicie tudo, todos voltam para a tela inicial
socket.on('force_setup', () => {
    window.location.reload();
});
