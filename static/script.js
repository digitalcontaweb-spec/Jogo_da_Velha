// ... (mantenha as variáveis e as funções iniciais como estão)

function startTimer() {
    clearInterval(countdown);
    timeLeft = 15;
    document.getElementById('timeLeft').innerText = timeLeft;
    countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            // Aqui você pode adicionar a lógica de punição se desejar
        }
    }, 1000);
}

socket.on('update_all', (data) => {
    // 1. Atualiza o tabuleiro e cores (Mantido)
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val || '';
        cells[i].style.color = (val === 'X') ? '#00ff88' : '#ef4444';
    });

    // 2. Atualiza Placar e Nomes (Mantido)
    document.getElementById('nameX').innerText = data.players['X'] || '---';
    document.getElementById('nameO').innerText = data.players['O'] || '---';
    document.getElementById('valX').innerText = data.score.X;
    document.getElementById('valO').innerText = data.score.O;

    // 3. Lógica de vitória ou continuidade (CORRIGIDO)
    if (data.winner) {
        clearInterval(countdown); // Para o tempo se houver vencedor
        const msg = data.winner === 'Velha' ? "EMPATE!" : (data.players[data.winner] + " VENCEU!");
        document.getElementById('result-message').innerText = msg;
        document.getElementById('result-overlay').style.display = 'flex';
    } else {
        document.getElementById('result-overlay').style.display = 'none';
        myTurn = (data.turn === myRole);
        
        if (data.ready_count >= 2) {
            document.getElementById('status').innerText = myTurn ? ">> SUA VEZ <<" : `AGUARDANDO: ${data.players[data.turn]}`;
            
            // DISPARO DO CRONÔMETRO: Só inicia se o jogo já começou (started: True no servidor)
            if (data.started) {
                startTimer();
            } else {
                // Se o jogo ainda não começou, apenas exibe os 15s parados (Visual Profissional)
                clearInterval(countdown);
                document.getElementById('timeLeft').innerText = "15";
            }
        } else {
            document.getElementById('status').innerText = "AGUARDANDO OPONENTE...";
        }
    }
});

// ... (mantenha o restante das funções move, joinGame, etc.)
