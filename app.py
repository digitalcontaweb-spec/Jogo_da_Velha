import eventlet
eventlet.monkey_patch() # Vital para o Render não travar as conexões

from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
# Configuração para permitir conexões de qualquer origem (CORS)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

rooms = {}

def check_winner(board):
    lines = [(0,1,2), (3,4,5), (6,7,8), (0,3,6), (1,4,7), (2,5,8), (0,4,8), (2,4,6)]
    for a, b, c in lines:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return 'Velha' if None not in board else None

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def handle_join(data):
    room, name = data['room'], data['name']
    join_room(room)
    
    if room not in rooms:
        rooms[room] = {
            'board': [None]*9, 
            'players': {}, 
            'turn': 'X', 
            'starter': 'X', # X começa o primeiro round de todos
            'score': {'X': 0, 'O': 0}, 
            'winner': None,
            'history': {'X': [], 'O': []}
        }
    
    game = rooms[room]
    # Atribuição de papel corrigida para evitar o erro "Todo mundo é Mário"
    if 'X' not in game['players']:
        role = 'X'
    elif 'O' not in game['players']:
        role = 'O'
    else:
        role = 'Espectador'
    
    if role != 'Espectador':
        game['players'][role] = name
    
    # Envia apenas para quem entrou para fixar a identidade
    emit('assign_role', {'role': role, 'name': name})
    # Atualiza todos os jogadores na sala
    emit('update_all', game, room=room)

@socketio.on('make_move')
def handle_move(data):
    room, idx, role = data['room'], data['index'], data['role']
    game = rooms.get(room)
    
    if game and game['board'][idx] is None and game['turn'] == role and not game['winner']:
        game['board'][idx] = role
        game['history'][role].append(idx) # Guarda para possível punição
        
        res = check_winner(game['board'])
        if res:
            game['winner'] = res
            if res != 'Velha': game['score'][res] += 1
        else:
            game['turn'] = 'O' if role == 'X' else 'X'
        emit('update_all', game, room=room)

@socketio.on('timeout_punishment')
def handle_timeout(data):
    room, role = data['room'], data['role']
    game = rooms.get(room)
    
    if game and game['turn'] == role and not game['winner']:
        # PUNIÇÃO: Apaga a última marcação do jogador que estourou o tempo
        if game['history'][role]:
            last_idx = game['history'][role].pop()
            game['board'][last_idx] = None
        
        # Passa a vez para o oponente
        game['turn'] = 'O' if role == 'X' else 'X'
        emit('update_all', game, room=room)

@socketio.on('reset_game')
def handle_reset(data):
    room = data['room']
    if room in rooms:
        game = rooms[room]
        # ALTERNÂNCIA: Inverte quem começa a próxima partida
        game['starter'] = 'O' if game['starter'] == 'X' else 'X'
        
        game.update({
            'board': [None]*9, 
            'winner': None, 
            'turn': game['starter'], # Define o turno inicial com o novo starter
            'history': {'X': [], 'O': []}
        })
        emit('update_all', game, room=room)

@socketio.on('full_reset')
def handle_full_reset(data):
    room = data['room']
    emit('force_setup', room=room)
    if room in rooms:
        del rooms[room]

if __name__ == '__main__':
    # Uso de threading apenas local; no Render o Gunicorn ignora isso
    socketio.run(app, debug=True)
