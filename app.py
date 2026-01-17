import eventlet
eventlet.monkey_patch() 
from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
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
            'board': [None]*9, 'players': {}, 'turn': 'X', 'starter': 'X',
            'score': {'X': 0, 'O': 0}, 'winner': None, 'started': False, 
            'ready_players': set()
        }
    g = rooms[room]
    # Atribuição robusta de papéis
    if name not in g['players'].values():
        if 'X' not in g['players']: g['players']['X'] = name
        elif 'O' not in g['players']: g['players']['O'] = name
    
    role = next((r for r, n in g['players'].items() if n == name), 'Espectador')
    emit('assign_role', {'role': role, 'name': name})
    # Atualiza todos para que os nomes apareçam no placar imediatamente
    emit('update_all', {**g, 'ready_count': len(g['ready_players'])}, room=room)

@socketio.on('player_ready')
def handle_ready(data):
    room, name = data['room'], data['name']
    if room in rooms:
        rooms[room]['ready_players'].add(name)
        emit('update_all', {**rooms[room], 'ready_count': len(rooms[room]['ready_players'])}, room=room)

@socketio.on('make_move')
def handle_move(data):
    room, idx, role = data['room'], data['index'], data['role']
    g = rooms.get(room)
    if g and len(g['ready_players']) >= 2 and g['board'][idx] is None and g['turn'] == role and not g['winner']:
        g['board'][idx] = role
        g['started'] = True 
        res = check_winner(g['board'])
        if res:
            g['winner'] = res
            if res != 'Velha': g['score'][res] += 1
        else:
            g['turn'] = 'O' if role == 'X' else 'X'
        emit('update_all', {**g, 'ready_count': len(g['ready_players'])}, room=room)

@socketio.on('reset_game')
def handle_reset(data):
    room = data['room']
    if room in rooms:
        g = rooms[room]
        g['starter'] = 'O' if g['starter'] == 'X' else 'X'
        g.update({'board': [None]*9, 'winner': None, 'turn': g['starter'], 'started': False})
        emit('update_all', {**g, 'ready_count': len(g['ready_players'])}, room=room)

@socketio.on('quit_game')
def handle_quit(data):
    emit('force_quit_all', room=data['room'])
    if data['room'] in rooms: del rooms[data['room']]

if __name__ == '__main__':
    socketio.run(app)
