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
    game = rooms[room]
    if name not in game['players'].values():
        if 'X' not in game['players']: game['players']['X'] = name
        elif 'O' not in game['players']: game['players']['O'] = name
    
    role = next((r for r, n in game['players'].items() if n == name), 'Espectador')
    emit('assign_role', {'role': role, 'name': name})
    emit('update_all', {**game, 'ready_count': len(game['ready_players'])}, room=room)

@socketio.on('player_ready')
def handle_ready(data):
    room, name = data['room'], data['name']
    if room in rooms:
        rooms[room]['ready_players'].add(name)
        emit('update_all', {**rooms[room], 'ready_count': len(rooms[room]['ready_players'])}, room=room)

@socketio.on('make_move')
def handle_move(data):
    room, idx, role = data['room'], data['index'], data['role']
    game = rooms.get(room)
    if game and len(game['ready_players']) >= 2 and game['board'][idx] is None and game['turn'] == role and not game['winner']:
        game['board'][idx] = role
        game['started'] = True 
        res = check_winner(game['board'])
        if res:
            game['winner'] = res
            if res != 'Velha': game['score'][res] += 1
        else:
            game['turn'] = 'O' if role == 'X' else 'X'
        emit('update_all', {**game, 'ready_count': len(game['ready_players'])}, room=room)

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
    socketio.run(app, debug=True)
