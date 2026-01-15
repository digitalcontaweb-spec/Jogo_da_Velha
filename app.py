import eventlet
eventlet.monkey_patch() # Isso deve ser a primeira linha!

from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
# O cors_allowed_origins="*" permite que o site receba jogadores da web
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
            'board': [None]*9, 'players': {}, 'turn': 'X', 
            'score': {'X': 0, 'O': 0}, 'winner': None,
            'history': {'X': [], 'O': []} # Para apagar a última jogada
        }
    
    game = rooms[room]
    role = 'X' if 'X' not in game['players'] else 'O' if 'O' not in game['players'] else 'Espectador'
    
    if role != 'Espectador':
        game['players'][role] = name
    
    # IMPORTANTE: assign_role sem room=room envia APENAS para quem conectou
    emit('assign_role', {'role': role, 'name': name})
    emit('update_all', game, room=room)

@socketio.on('make_move')
def handle_move(data):
    room, idx, role = data['room'], data['index'], data['role']
    game = rooms.get(room)
    
    if game and game['board'][idx] is None and game['turn'] == role and not game['winner']:
        game['board'][idx] = role
        game['history'][role].append(idx) # Salva no histórico
        
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
        # PUNIÇÃO: Apaga a última jogada feita por este jogador
        if game['history'][role]:
            last_idx = game['history'][role].pop()
            game['board'][last_idx] = None
        
        # Passa a vez
        game['turn'] = 'O' if role == 'X' else 'X'
        emit('update_all', game, room=room)

@socketio.on('reset_game')
def handle_reset(data):
    room = data['room']
    if room in rooms:
        rooms[room].update({'board': [None]*9, 'winner': None, 'turn': 'X', 'history': {'X': [], 'O': []}})
        emit('update_all', rooms[room], room=room)

@socketio.on('full_reset')
def handle_full_reset(data):
    emit('force_setup', room=data['room'])
    if data['room'] in rooms: del rooms[data['room']]

if __name__ == '__main__':

    socketio.run(app, debug=True, port=5000)

