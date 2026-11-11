#!/usr/bin/env python3
"""Servidor local de A Última Muralha; Python 3, sem dependências externas."""

import argparse
from collections import deque
from contextlib import closing
import hashlib
import hmac
from http import HTTPStatus
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import sys
import threading
import time
import unicodedata
from urllib.parse import parse_qs, unquote, urlsplit


PASSWORD_ITERATIONS = 600_000
SESSION_SECONDS = 7 * 24 * 60 * 60
COOKIE_NAME = 'muralha_session'
MAX_BODY = 16_384
DEFAULT_SETTINGS = {
    'healthDropChance': 0.05, 'bossTime': 900,
    'spawnBaseRate': 1.1, 'spawnGrowth': 0.0115, 'maxEnemies': 240,
}
SETTING_LIMITS = {
    'healthDropChance': (0, 1, False), 'bossTime': (10, 3600, False),
    'spawnBaseRate': (0, 20, False), 'spawnGrowth': (0, 0.1, False),
    'maxEnemies': (1, 240, True),
}
DIFFICULTY_SCORES = {'easy': 0.75, 'medium': 1.0, 'hard': 1.5, 'hardcore': 2.5}
STAGE_ORDER = ('forest', 'castle', 'catacombs')
STAGES = frozenset(STAGE_ORDER)
HEROES = frozenset(('vanguard', 'ranger', 'mage', 'channeler'))
POWERS = frozenset(('slash', 'arrows', 'arcane', 'blades', 'lightning',
                    'fireball', 'orbs', 'pierce', 'burst', 'axes', 'frost', 'poison',
                    'soulblade', 'tempest', 'inferno', 'reaper_axes', 'blizzard', 'miasma',
                    'celestial_ring', 'singularity',
                    'cyclone', 'radiant_beam', 'plasma', 'meteor',
                    'fire_hurricane', 'celestial_judgment', 'plasma_storm', 'meteor_cataclysm'))
ENEMIES = frozenset((
    'skel_warrior', 'bat', 'skel_archer', 'spider', 'skel_shield', 'cultist',
    'skel_mage', 'skel_fighter', 'dark_knight', 'cultist_thrower', 'giant_bat',
    'crossbowman', 'specter', 'giant_spider', 'floating_skull', 'mounted_knight',
    'reaper', 'elite_knight', 'gargoyle', 'gunner', 'necromancer', 'stone_golem',
    'giant_skeleton', 'dark_beast', 'storm_caller', 'poisoner', 'frost_wraith',
    'hell_charger', 'storm_warden', 'crypt_lord',
    'forest_wolf', 'forest_spider', 'forest_wisp', 'forest_bandit', 'forest_rootling',
    'forest_moth', 'forest_druid', 'forest_stalker', 'forest_matriarch', 'forest_huntsman',
    'forest_boar', 'forest_snake', 'forest_raven', 'forest_sentinel',
    'forest_witch', 'forest_storm_mage',
    'forest_oathkeeper', 'crypt_ghost', 'crypt_bone_archer', 'crypt_crawler',
    'crypt_acolyte', 'crypt_sentinel', 'crypt_banshee', 'crypt_executioner', 'crypt_soulkeeper',
    'inferno_ember_bat', 'inferno_chain_lancer', 'inferno_pyromancer',
    'inferno_furnace_golem', 'inferno_ash_reaper',
))
EMPTY_COMMANDS = frozenset(('heal', 'boss', 'clear', 'maxpowers', 'killboss'))
STAT_LIMITS = {
    'hp': (0, 1_000_000, False), 'maxHp': (1, 1_000_000, False),
    'speed': (10, 1500, False), 'damage': (0.1, 100, False),
    'rate': (0.1, 20, False), 'area': (0.1, 10, False), 'range': (0.1, 10, False),
}


class APIError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def require_fields(value, fields, optional=()):
    if not isinstance(value, dict) or set(value) - set(fields) - set(optional) or set(fields) - set(value):
        raise APIError(400, 'Campos inválidos ou ausentes.')


def number(value, name, minimum, maximum, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise APIError(400, f'{name}: informe um número válido.')
    if not math.isfinite(value) or not minimum <= value <= maximum or (integer and int(value) != value):
        raise APIError(400, f'{name}: valor fora dos limites permitidos.')
    return int(value) if integer else value


def boolean(value, name):
    if type(value) is not bool:
        raise APIError(400, f'{name}: informe verdadeiro ou falso.')
    return value


def username_input(value):
    if not isinstance(value, str):
        raise APIError(400, 'Informe um nome de usuário.')
    value = unicodedata.normalize('NFKC', value).strip()
    if not 3 <= len(value) <= 20 or not all(c.isalnum() or c in '_-.' for c in value):
        raise APIError(400, 'Usuário: 3 a 20 letras, números, ponto, _ ou -.')
    return value, value.casefold()


def password_input(value):
    if not isinstance(value, str) or not 8 <= len(value) <= 128 or '\x00' in value:
        raise APIError(400, 'A senha deve ter de 8 a 128 caracteres.')
    return value


def password_hash(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}'


def password_matches(password, encoded):
    try:
        algorithm, iterations, salt, expected = encoded.split('$')
        if algorithm != 'pbkdf2_sha256' or int(iterations) != PASSWORD_ITERATIONS:
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError, UnicodeError):
        return False


def token_hash(token):
    return hashlib.sha256(token.encode('ascii')).hexdigest()


def json_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Campo repetido.')
        result[key] = value
    return result


def invalid_constant(_):
    raise ValueError('Número JSON inválido.')


class RateLimiter:
    def __init__(self):
        self.lock = threading.Lock()
        self.buckets = {}

    def check(self, key, limit, period):
        now = time.monotonic()
        with self.lock:
            if len(self.buckets) > 4096:
                self.buckets = {k: v for k, v in self.buckets.items() if v and now - v[-1] < 600}
                if len(self.buckets) > 4096:
                    raise APIError(429, 'Muitas solicitações. Tente novamente em alguns minutos.')
            bucket = self.buckets.setdefault(key, deque())
            while bucket and bucket[0] <= now - period:
                bucket.popleft()
            if len(bucket) >= limit:
                raise APIError(429, 'Muitas solicitações. Tente novamente em alguns minutos.')
            bucket.append(now)


class GameApplication:
    def __init__(self, root, private_dir=None):
        self.root = Path(root).resolve()
        configured = private_dir
        if configured is None:
            configured = os.environ.get('MURALHA_DATA_DIR') or (
                Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local' / 'share') / 'a-ultima-muralha')
        configured = Path(configured).expanduser()
        if configured.is_symlink():
            raise RuntimeError('A pasta privada não pode ser um link simbólico.')
        self.private = configured.resolve()
        if self.private == self.root or self.root in self.private.parents:
            raise RuntimeError('Os dados privados devem ficar fora da pasta publicada do jogo.')
        legacy_private = self.root / '.private'
        if legacy_private.exists() or legacy_private.is_symlink():
            raise RuntimeError('Existe uma pasta .private legada dentro do jogo. Pare o Live Server e mova os dados para fora da pasta publicada antes de iniciar.')
        self.private.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.private.chmod(0o700)
        self.db_path = self.private / 'jogo.sqlite3'
        if self.db_path.is_symlink():
            raise RuntimeError('O banco não pode ser um link simbólico.')
        fd = os.open(self.db_path, os.O_CREAT | os.O_WRONLY, 0o600)
        os.close(fd)
        self.db_path.chmod(0o600)
        self.limiter = RateLimiter()
        self.hash_slots = threading.BoundedSemaphore(4)
        self.initialize()

    def connect(self):
        db = sqlite3.connect(self.db_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        return db

    def initialize(self):
        with closing(self.connect()) as db, db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY, username TEXT NOT NULL,
                    username_key TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin','player')),
                    banned INTEGER NOT NULL DEFAULT 0 CHECK(banned IN (0,1)),
                    created_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                    csrf TEXT NOT NULL, created_at REAL NOT NULL, expires_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                    hero TEXT NOT NULL, practice INTEGER NOT NULL, ranked INTEGER NOT NULL,
                    started_at REAL NOT NULL, finished_at REAL,
                    state TEXT NOT NULL DEFAULT 'started' CHECK(state IN ('started','finished','abandoned')),
                    settings_json TEXT NOT NULL, session_hash TEXT, difficulty TEXT NOT NULL DEFAULT 'medium',
                    start_stage TEXT NOT NULL DEFAULT 'castle', current_stage TEXT NOT NULL DEFAULT 'castle', advanced_at REAL,
                    forest_cleared INTEGER NOT NULL DEFAULT 0, castle_cleared INTEGER NOT NULL DEFAULT 0,
                    kills INTEGER, damage REAL, duration REAL, level INTEGER,
                    victory INTEGER, points INTEGER
                );
                CREATE INDEX IF NOT EXISTS run_user ON runs(user_id,state,ranked);
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY CHECK(id=1), value_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS audit (
                    id INTEGER PRIMARY KEY, actor_id INTEGER NOT NULL REFERENCES users(id),
                    action TEXT NOT NULL, target_id INTEGER, detail_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                );
            ''')
            # Migra bancos locais criados antes da vinculação da partida à sessão.
            columns = {row['name'] for row in db.execute('PRAGMA table_info(runs)')}
            if 'session_hash' not in columns:
                db.execute('ALTER TABLE runs ADD COLUMN session_hash TEXT')
            if 'difficulty' not in columns:
                db.execute("ALTER TABLE runs ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium'")
            for name, declaration in (('start_stage', "TEXT NOT NULL DEFAULT 'castle'"),
                                      ('current_stage', "TEXT NOT NULL DEFAULT 'castle'"), ('advanced_at', 'REAL')):
                if name not in columns:
                    db.execute(f'ALTER TABLE runs ADD COLUMN {name} {declaration}')
            migrate_progress = 'forest_cleared' not in columns or 'castle_cleared' not in columns
            for name in ('forest_cleared', 'castle_cleared'):
                if name not in columns:
                    db.execute(f'ALTER TABLE runs ADD COLUMN {name} INTEGER NOT NULL DEFAULT 0')
            for name, declaration in (('campaign_version', 'INTEGER NOT NULL DEFAULT 2'),
                                      ('catacombs_at', 'REAL'),
                                      ('catacombs_cleared', 'INTEGER NOT NULL DEFAULT 0')):
                if name not in columns:
                    db.execute(f'ALTER TABLE runs ADD COLUMN {name} {declaration}')
            db.execute("UPDATE runs SET state='abandoned',ranked=0 WHERE state='started' AND session_hash IS NULL")
            if migrate_progress:
                self.migrate_progress(db)
            db.execute('CREATE INDEX IF NOT EXISTS run_session ON runs(session_hash,state)')
            db.execute('INSERT OR IGNORE INTO settings(id,value_json) VALUES(1,?)',
                       (json.dumps(DEFAULT_SETTINGS),))
            # Atualiza só a configuração antiga de fábrica; regras personalizadas permanecem.
            current_settings = self.settings(db)
            legacy_defaults = {**DEFAULT_SETTINGS, 'bossTime': 540}
            if current_settings == legacy_defaults:
                db.execute('UPDATE settings SET value_json=? WHERE id=1', (json.dumps(DEFAULT_SETTINGS),))
            db.execute('CREATE INDEX IF NOT EXISTS run_difficulty ON runs(difficulty,state,ranked,user_id)')
            if not db.execute("SELECT id FROM users WHERE role='admin'").fetchone():
                credentials = {'username': 'admin', 'password': secrets.token_urlsafe(24)}
                credential_path = self.private / 'admin-inicial.json'
                if credential_path.exists() or credential_path.is_symlink():
                    raise RuntimeError('Credencial inicial existente sem conta admin; restaure o banco ou mova o arquivo privado.')
                encoded = password_hash(credentials['password'])
                db.execute('INSERT INTO users(username,username_key,password_hash,role,created_at) VALUES(?,?,?,?,?)',
                           ('admin', 'admin', encoded, 'admin', time.time()))
                # Nunca escreve a senha nos logs, HTML, JavaScript ou nas respostas HTTP.
                fd = os.open(credential_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, 'w', encoding='utf-8') as out:
                    json.dump(credentials, out, ensure_ascii=False, indent=2)
                    out.write('\n')
                    out.flush()
                    os.fsync(out.fileno())
            db.execute('DELETE FROM sessions WHERE expires_at <= ?', (time.time(),))

    def settings(self, db):
        return json.loads(db.execute('SELECT value_json FROM settings WHERE id=1').fetchone()[0])

    def migrate_progress(self, db):
        # Os marcos são gravados uma vez, sem alterar os resultados históricos.
        rows = db.execute('''SELECT r.* FROM runs r JOIN users u ON u.id=r.user_id
            WHERE u.role='player' AND r.practice=0''').fetchall()
        for run in rows:
            try:
                settings = json.loads(run['settings_json'])
                boss_time = number(settings['bossTime'], 'bossTime', *SETTING_LIMITS['bossTime'])
                started = number(run['started_at'], 'started_at', 0, math.inf)
            except (APIError, ValueError, TypeError, KeyError):
                continue
            forest_cleared = False
            if run['start_stage'] == 'forest' and run['current_stage'] == 'castle':
                try:
                    advanced = number(run['advanced_at'], 'advanced_at', started, time.time())
                    forest_cleared = advanced - started + 10 >= boss_time
                except APIError:
                    pass
            castle_cleared = False
            if run['state'] == 'finished' and run['victory'] == 1 and run['current_stage'] == 'castle':
                try:
                    finished = number(run['finished_at'], 'finished_at', started, time.time())
                    duration = number(run['duration'], 'duration', 0, 14_400)
                    kills = number(run['kills'], 'kills', 0, 1_000_000, True)
                    damage = number(run['damage'], 'damage', 0, 1_000_000_000)
                    number(run['level'], 'level', 1, 100, True)
                    required = boss_time * (2 if run['start_stage'] == 'forest' else 1)
                    castle_cleared = (run['hero'] in HEROES and run['start_stage'] in STAGES
                        and finished - started <= 86_400 and duration <= finished - started + 10
                        and duration + 1 >= required and kills <= duration * 60 + 240
                        and damage <= duration * 50_000 + 10_000
                        and (run['start_stage'] == 'castle'
                             or forest_cleared and finished - advanced + 1 >= boss_time))
                except APIError:
                    pass
            db.execute('UPDATE runs SET forest_cleared=?,castle_cleared=? WHERE id=?',
                       (int(forest_cleared), int(castle_cleared), run['id']))

    def profile(self, db, user):
        progress = {'castle_unlocked': False, 'forest_clears': 0, 'castle_clears': 0,
                    'catacombs_unlocked': False, 'catacombs_clears': 0}
        stats = {'runs': 0, 'victories': 0, 'kills': 0, 'damage': 0, 'points': 0, 'best_points': 0}
        if user and user['role'] == 'player':
            clears = db.execute('''SELECT COALESCE(SUM(forest_cleared),0),COALESCE(SUM(castle_cleared),0),
                COALESCE(SUM(catacombs_cleared),0)
                FROM runs WHERE user_id=? AND practice=0''', (user['id'],)).fetchone()
            progress = {'castle_unlocked': bool(clears[0] or clears[1]),
                        'forest_clears': clears[0], 'castle_clears': clears[1],
                        'catacombs_unlocked': bool(clears[1] or clears[2]), 'catacombs_clears': clears[2]}
            stats = dict(db.execute('''SELECT COUNT(*) AS runs,COALESCE(SUM(victory),0) AS victories,
                COALESCE(SUM(kills),0) AS kills,COALESCE(SUM(damage),0) AS damage,
                COALESCE(SUM(points),0) AS points,COALESCE(MAX(points),0) AS best_points
                FROM runs WHERE user_id=? AND state='finished' AND ranked=1 AND practice=0''',
                (user['id'],)).fetchone())
        return {'progress': progress, 'stats': stats}

    def session(self, db, cookie_header):
        try:
            cookie = SimpleCookie()
            cookie.load(cookie_header or '')
            token = cookie[COOKIE_NAME].value if COOKIE_NAME in cookie else ''
            if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
                return None
        except CookieError:
            return None
        return db.execute('''SELECT u.*,s.token_hash,s.csrf,s.expires_at FROM sessions s
            JOIN users u ON u.id=s.user_id
            WHERE s.token_hash=? AND s.expires_at>? AND u.banned=0''',
            (token_hash(token), time.time())).fetchone()

    def session_payload(self, db, user):
        return {'user': ({key: user[key] for key in ('id', 'username', 'role')} if user else None),
                'csrf': user['csrf'] if user else None, 'settings': self.settings(db), **self.profile(db, user)}

    def new_session(self, db, user_id, previous=None):
        now = time.time()
        db.execute('DELETE FROM sessions WHERE expires_at<=?', (now,))
        if previous:
            self.invalidate_session_runs(db, previous['token_hash'])
            db.execute('DELETE FROM sessions WHERE token_hash=?', (previous['token_hash'],))
        # Limita sessões simultâneas, preservando as nove mais recentes.
        db.execute('''DELETE FROM sessions WHERE user_id=? AND token_hash NOT IN
            (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 9)''',
            (user_id, user_id))
        token = secrets.token_urlsafe(32)
        db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',
                   (token_hash(token), user_id, secrets.token_urlsafe(32), now, now + SESSION_SECONDS))
        cookie = f'{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_SECONDS}'
        user = self.session(db, f'{COOKIE_NAME}={token}')
        return self.session_payload(db, user), cookie

    def invalidate_session_runs(self, db, session_hash):
        db.execute("UPDATE runs SET state='abandoned',ranked=0 WHERE session_hash=? AND state='started'", (session_hash,))

    def audit(self, db, actor, action, details, target=None):
        db.execute('INSERT INTO audit(actor_id,action,target_id,detail_json,created_at) VALUES(?,?,?,?,?)',
                   (actor['id'], action, target, json.dumps(details, ensure_ascii=False), time.time()))

    def validate_command(self, body):
        require_fields(body, ('command', 'args'))
        command, args = body['command'], body['args']
        if not isinstance(command, str) or not isinstance(args, dict):
            raise APIError(400, 'Comando inválido.')
        if command in EMPTY_COMMANDS:
            require_fields(args, ())
        elif command == 'stats':
            if not args or set(args) - STAT_LIMITS.keys():
                raise APIError(400, 'Atributos inválidos.')
            for key, value in args.items():
                number(value, key, *STAT_LIMITS[key])
            if 'hp' in args and 'maxHp' in args and args['hp'] > args['maxHp']:
                raise APIError(400, 'A vida não pode exceder a vida máxima.')
        elif command == 'spawn':
            require_fields(args, ('enemy', 'count'))
            if not isinstance(args['enemy'], str) or args['enemy'] not in ENEMIES:
                raise APIError(400, 'Inimigo desconhecido.')
            number(args['count'], 'count', 1, 240, True)
        elif command == 'power':
            require_fields(args, ('id', 'level'))
            if not isinstance(args['id'], str) or args['id'] not in POWERS:
                raise APIError(400, 'Poder desconhecido.')
            number(args['level'], 'level', 1, 8, True)
        elif command == 'level':
            require_fields(args, ('level',))
            number(args['level'], 'level', 1, 100, True)
        elif command == 'xp':
            require_fields(args, ('amount',))
            number(args['amount'], 'amount', 0, 100_000, True)
        elif command == 'teleport':
            require_fields(args, ('x', 'y'))
            for key in ('x', 'y'):
                number(args[key], key, 150, 3850)
        elif command in ('god', 'spawning'):
            require_fields(args, ('enabled',))
            boolean(args['enabled'], 'enabled')
        else:
            raise APIError(400, 'Comando desconhecido.')
        return command, args

    def dispatch(self, handler, path, query, body):
        method = handler.command
        cookie = None
        with closing(self.connect()) as db:
            # Serializa leituras de permissão e alterações para ban/sessão não competir
            # com envio de score ou comando privilegiado em outra thread.
            if method == 'POST':
                db.execute('BEGIN IMMEDIATE')
            try:
                user = self.session(db, handler.headers.get('Cookie'))
                if method == 'GET' and path == '/api/session':
                    return self.session_payload(db, user), None
                if method == 'GET' and path == '/api/leaderboard':
                    sort = query.get('sort', ['points'])
                    if len(sort) != 1 or sort[0] not in ('points', 'kills', 'damage'):
                        raise APIError(400, 'Ordenação inválida.')
                    difficulty = query.get('difficulty', ['medium'])
                    if len(difficulty) != 1 or difficulty[0] not in DIFFICULTY_SCORES:
                        raise APIError(400, 'Dificuldade inválida.')
                    stages = query.get('stage', [None])
                    if len(stages) != 1 or stages[0] is not None and stages[0] not in STAGES:
                        raise APIError(400, 'Fase inválida.')
                    stage = stages[0]
                    column = sort[0]  # Somente os três identificadores permitidos acima.
                    rows = db.execute(f'''WITH best AS (
                        SELECT u.username,r.*,
                        ROW_NUMBER() OVER (PARTITION BY r.user_id
                            ORDER BY r.{column} DESC,r.points DESC,r.kills DESC,r.damage DESC,r.finished_at ASC,r.id ASC) AS place
                        FROM runs r JOIN users u ON u.id=r.user_id
                        WHERE r.state='finished' AND r.ranked=1 AND u.role='player' AND u.banned=0 AND r.difficulty=? AND (? IS NULL OR r.start_stage=?)
                    ) SELECT username,points,kills,damage,duration,hero,victory,difficulty,start_stage AS stage,current_stage AS reached_stage FROM best WHERE place=1
                    ORDER BY {column} DESC,points DESC,kills DESC,damage DESC,username ASC LIMIT 50''', (difficulty[0], stage, stage)).fetchall()
                    entries = []
                    for rank, row in enumerate(rows, 1):
                        entry = dict(row)
                        entry.update(rank=rank, victory=bool(row['victory']))
                        entries.append(entry)
                    return {'entries': entries}, None
                if method == 'POST' and user:
                    supplied = handler.headers.get('X-CSRF-Token', '')
                    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', supplied) or not hmac.compare_digest(supplied, user['csrf']):
                        raise APIError(403, 'Sessão alterada ou token CSRF inválido. Atualize a página.')
                if method == 'POST' and path in ('/api/register', '/api/login'):
                    require_fields(body, ('username', 'password'))
                    username, username_key = username_input(body['username'])
                    password = password_input(body['password'])
                    ip = handler.client_address[0]
                    self.limiter.check(('auth-ip', ip), 30, 600)
                    self.limiter.check(('auth-user', username_key), 12, 600)
                    if not self.hash_slots.acquire(blocking=False):
                        raise APIError(429, 'Autenticação ocupada. Aguarde e tente novamente.')
                    try:
                        account = db.execute('SELECT * FROM users WHERE username_key=?', (username_key,)).fetchone()
                        if path == '/api/register':
                            self.limiter.check(('register-ip', ip), 8, 600)
                            if account:
                                raise APIError(409, 'Este nome de usuário já está em uso.')
                            encoded = password_hash(password)
                            cursor = db.execute('''INSERT INTO users(username,username_key,password_hash,created_at)
                                VALUES(?,?,?,?)''', (username, username_key, encoded, time.time()))
                            account_id = cursor.lastrowid
                        else:
                            if account:
                                valid = password_matches(password, account['password_hash'])
                            else:
                                # Trabalho equivalente para não revelar existência da conta pelo tempo.
                                hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'no-such-user-salt', PASSWORD_ITERATIONS)
                                valid = False
                            if not valid:
                                raise APIError(401, 'Usuário ou senha incorretos.')
                            if account['banned']:
                                raise APIError(403, 'Esta conta está banida.')
                            account_id = account['id']
                        result, cookie = self.new_session(db, account_id, user)
                    finally:
                        self.hash_slots.release()
                else:
                    if not user:
                        raise APIError(401, 'Entre na sua conta para continuar.')
                    if path.startswith('/api/admin/') and user['role'] != 'admin':
                        raise APIError(403, 'Apenas administradores podem usar esta função.')
                    if method == 'POST' and path == '/api/logout':
                        require_fields(body, ())
                        self.invalidate_session_runs(db, user['token_hash'])
                        db.execute('DELETE FROM sessions WHERE token_hash=?', (user['token_hash'],))
                        cookie = f'{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
                        result = {'ok': True}
                    elif method == 'POST' and path == '/api/password':
                        require_fields(body, ('currentPassword', 'newPassword'))
                        current = password_input(body['currentPassword'])
                        new = password_input(body['newPassword'])
                        self.limiter.check(('password', user['id']), 8, 600)
                        if not password_matches(current, user['password_hash']):
                            raise APIError(400, 'A senha atual está incorreta.')
                        db.execute('UPDATE users SET password_hash=? WHERE id=?', (password_hash(new), user['id']))
                        db.execute("""UPDATE runs SET state='abandoned',ranked=0 WHERE state='started' AND session_hash IN
                            (SELECT token_hash FROM sessions WHERE user_id=? AND token_hash<>?)""", (user['id'], user['token_hash']))
                        db.execute('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', (user['id'], user['token_hash']))
                        self.audit(db, user, 'password', {}, user['id'])
                        result = {'ok': True}
                    elif method == 'POST' and path == '/api/runs/start':
                        require_fields(body, ('hero', 'practice'), ('difficulty', 'stage'))
                        stage = body.get('stage', 'forest')
                        if not isinstance(stage, str) or stage not in STAGES:
                            raise APIError(400, 'Fase inválida.')
                        difficulty = body.get('difficulty', 'medium')
                        if not isinstance(difficulty, str) or difficulty not in DIFFICULTY_SCORES:
                            raise APIError(400, 'Dificuldade inválida.')
                        hero = body['hero']
                        if not isinstance(hero, str) or hero not in HEROES:
                            raise APIError(400, 'Personagem desconhecido.')
                        practice = boolean(body['practice'], 'practice')
                        if stage == 'castle' and user['role'] != 'admin' and not self.profile(db, user)['progress']['castle_unlocked']:
                            raise APIError(403, 'Conclua a floresta para desbloquear o castelo.')
                        if stage == 'catacombs' and user['role'] != 'admin' and not self.profile(db, user)['progress']['catacombs_unlocked']:
                            raise APIError(403, 'Conclua o castelo para desbloquear o Inferno.')
                        self.limiter.check(('run-start', user['id']), 40, 600)
                        settings = self.settings(db)
                        ranked = user['role'] == 'player' and not practice and settings == DEFAULT_SETTINGS
                        run_id = secrets.token_urlsafe(24)
                        db.execute("UPDATE runs SET state='abandoned' WHERE user_id=? AND state='started'", (user['id'],))
                        db.execute('''INSERT INTO runs(id,user_id,hero,practice,ranked,started_at,settings_json,session_hash,difficulty,start_stage,current_stage,campaign_version)
                            VALUES(?,?,?,?,?,?,?,?,?,?,?,3)''', (run_id, user['id'], hero, int(practice), int(ranked), time.time(), json.dumps(settings), user['token_hash'], difficulty, stage, stage))
                        result = {'run_id': run_id, 'ranked': ranked, 'settings': settings, 'difficulty': difficulty, 'stage': stage, 'campaign_version': 3}
                    elif method == 'POST' and path == '/api/runs/advance':
                        require_fields(body, ('run_id',), ('stage',))
                        target = body.get('stage', 'castle')
                        if not isinstance(target, str) or target not in ('castle', 'catacombs'):
                            raise APIError(400, 'Destino de passagem inválido.')
                        run_id = body['run_id']
                        if not isinstance(run_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{32}', run_id):
                            raise APIError(400, 'Partida inválida.')
                        run = db.execute('SELECT * FROM runs WHERE id=? AND user_id=?', (run_id, user['id'])).fetchone()
                        if not run:
                            raise APIError(404, 'Partida não encontrada.')
                        if run['state'] != 'started' or not run['session_hash'] or not hmac.compare_digest(run['session_hash'], user['token_hash']):
                            raise APIError(409, 'Esta partida terminou ou pertence a outra sessão.')
                        if target == 'catacombs' and run['campaign_version'] < 3:
                            raise APIError(400, 'Esta partida pertence à campanha anterior.')
                        current_index, target_index = STAGE_ORDER.index(run['current_stage']), STAGE_ORDER.index(target)
                        stamp = 'advanced_at' if target == 'castle' else 'catacombs_at'
                        if target_index < current_index:
                            raise APIError(409, 'Esta partida já atravessou essa passagem.')
                        if target_index == current_index and run[stamp] is None:
                            raise APIError(400, 'Esta partida já começou nesta fase.')
                        if target_index > current_index + 1:
                            raise APIError(400, 'Conclua a fase atual antes de avançar.')
                        # O alvo explícito impede que retries avancem a fase seguinte.
                        if target_index == current_index + 1:
                            settings = json.loads(run['settings_json'])
                            phase_started = run['advanced_at'] if run['current_stage'] == 'castle' and run['start_stage'] == 'forest' else run['started_at']
                            if phase_started is None or (not run['practice'] and user['role'] == 'player' and time.time() - phase_started + 10 < settings['bossTime']):
                                raise APIError(400, 'A fase atual ainda não foi concluída.')
                            cleared = not run['practice'] and user['role'] == 'player'
                            clear_field = 'forest_cleared' if target == 'castle' else 'castle_cleared'
                            db.execute(f'UPDATE runs SET current_stage=?,{stamp}=?,{clear_field}=? WHERE id=?',
                                       (target, time.time(), int(cleared), run_id))
                        result = {'stage': target, 'run_id': run_id, **self.profile(db, user)}
                    elif method == 'POST' and path == '/api/runs/finish':
                        require_fields(body, ('run_id', 'kills', 'damage', 'duration', 'hero', 'level', 'victory'))
                        run_id = body['run_id']
                        if not isinstance(run_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{32}', run_id):
                            raise APIError(400, 'Partida inválida.')
                        run = db.execute('SELECT * FROM runs WHERE id=? AND user_id=?', (run_id, user['id'])).fetchone()
                        if not run:
                            raise APIError(404, 'Partida não encontrada.')
                        if run['state'] != 'started':
                            raise APIError(409, 'Esta partida já foi encerrada ou substituída.')
                        if not run['session_hash'] or not hmac.compare_digest(run['session_hash'], user['token_hash']):
                            raise APIError(409, 'Esta partida pertence a outra sessão. Inicie uma nova partida.')
                        if body['hero'] != run['hero']:
                            raise APIError(400, 'O personagem difere do início da partida.')
                        kills = number(body['kills'], 'kills', 0, 1_000_000, True)
                        damage = number(body['damage'], 'damage', 0, 1_000_000_000)
                        duration = number(body['duration'], 'duration', 0, 14_400)
                        level = number(body['level'], 'level', 1, 100, True)
                        victory = boolean(body['victory'], 'victory')
                        now = time.time()
                        elapsed = now - run['started_at']
                        if elapsed < 0 or elapsed > 86_400 or duration > elapsed + 10:
                            raise APIError(400, 'A duração não corresponde ao tempo desta partida.')
                        if kills > duration * 60 + 240 or damage > duration * 50_000 + 10_000:
                            raise APIError(400, 'Estatísticas fora dos limites plausíveis.')
                        settings = json.loads(run['settings_json'])
                        final_stage = 'catacombs' if run['campaign_version'] >= 3 else 'castle'
                        phase_count = STAGE_ORDER.index(final_stage) - STAGE_ORDER.index(run['start_stage']) + 1
                        required = settings['bossTime'] * phase_count
                        if victory and (duration + 1 < required or run['current_stage'] != final_stage):
                            raise APIError(400, 'Vitória antes de concluir as fases e o chefe final.')
                        final_started = (run['catacombs_at'] if final_stage == 'catacombs' else run['advanced_at']) if run['start_stage'] != final_stage else run['started_at']
                        if victory and (final_started is None or not run['practice'] and user['role'] == 'player' and now - final_started + 1 < settings['bossTime']):
                            raise APIError(400, 'O chefe final ainda não poderia ter surgido.')
                        base_points = kills * 100 + math.floor(damage) * 2 + math.floor(duration) * 10 + (5000 if victory else 0)
                        points = math.floor(base_points * DIFFICULTY_SCORES[run['difficulty']])
                        ranked = bool(run['ranked'] and user['role'] == 'player')
                        cleared = victory and not run['practice'] and user['role'] == 'player'
                        db.execute('''UPDATE runs SET state='finished',finished_at=?,kills=?,damage=?,duration=?,level=?,
                            victory=?,points=?,ranked=?,castle_cleared=MAX(castle_cleared,?),
                            catacombs_cleared=MAX(catacombs_cleared,?) WHERE id=? AND state='started' ''',
                            (now, kills, damage, duration, level, int(victory), points, int(ranked),
                             int(cleared and final_stage == 'castle'), int(cleared and final_stage == 'catacombs'), run_id))
                        result = {'saved': True, 'ranked': ranked, 'points': points, **self.profile(db, user)}
                    elif method == 'GET' and path == '/api/admin/users':
                        search_values = query.get('search', [''])
                        if len(search_values) != 1 or len(search_values[0]) > 80:
                            raise APIError(400, 'Busca inválida.')
                        search = unicodedata.normalize('NFKC', search_values[0]).casefold()
                        # instr trata % e _ como texto, sem curingas surpresa.
                        rows = db.execute('''SELECT id,username,role,banned,created_at FROM users
                            WHERE instr(username_key,?)>0 ORDER BY created_at DESC,id DESC LIMIT 200''', (search,)).fetchall()
                        result = {'users': [{**dict(row), 'banned': bool(row['banned'])} for row in rows]}
                    elif method == 'POST' and path == '/api/admin/ban':
                        require_fields(body, ('user_id', 'banned', 'reason'))
                        target_id = number(body['user_id'], 'user_id', 1, 9_007_199_254_740_991, True)
                        banned = boolean(body['banned'], 'banned')
                        reason = body['reason']
                        if not isinstance(reason, str) or len(reason) > 500 or any(ord(c) < 32 for c in reason):
                            raise APIError(400, 'Motivo inválido; use até 500 caracteres.')
                        target = db.execute('SELECT * FROM users WHERE id=?', (target_id,)).fetchone()
                        if not target:
                            raise APIError(404, 'Conta não encontrada.')
                        if target['role'] == 'admin':
                            raise APIError(400, 'Contas administrativas não podem ser banidas.')
                        db.execute('UPDATE users SET banned=? WHERE id=?', (int(banned), target_id))
                        if banned:
                            db.execute("UPDATE runs SET state='abandoned',ranked=0 WHERE user_id=? AND state='started'", (target_id,))
                            db.execute('DELETE FROM sessions WHERE user_id=?', (target_id,))
                        self.audit(db, user, 'ban', {'banned': banned, 'reason': reason.strip()}, target_id)
                        result = {'ok': True}
                    elif method == 'POST' and path == '/api/admin/command':
                        command, args = self.validate_command(body)
                        self.limiter.check(('command', user['id']), 120, 60)
                        self.audit(db, user, 'command', body)
                        result = {'command': command, 'args': args}
                    elif method == 'POST' and path == '/api/admin/settings':
                        require_fields(body, SETTING_LIMITS.keys())
                        settings = {key: number(body[key], key, *limits) for key, limits in SETTING_LIMITS.items()}
                        previous = self.settings(db)
                        db.execute('UPDATE settings SET value_json=? WHERE id=1', (json.dumps(settings),))
                        self.audit(db, user, 'settings', {'before': previous, 'after': settings})
                        result = {'settings': settings}
                    else:
                        raise APIError(404, 'Endpoint não encontrado.')
                db.commit()
                return result, cookie
            except Exception:
                db.rollback()
                raise


class GameServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, app):
        self.app = app
        self.slots = threading.BoundedSemaphore(32)
        super().__init__(address, GameHandler)
        self.allowed_hosts = frozenset(f'{host}:{self.server_port}' for host in ('127.0.0.1', 'localhost'))
        self.allowed_origins = frozenset(
            f'http://{host}:{port}' for host in ('127.0.0.1', 'localhost') for port in (5500, self.server_port))

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()

    def handle_error(self, request, client_address):
        print('Falha ao atender uma conexão local.', file=sys.stderr)


class GameHandler(BaseHTTPRequestHandler):
    server_version = 'MuralhaLocal/1.0'
    sys_version = ''

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, format, *args):
        # Não registra dados, cookies, tokens ou possíveis senhas de uma requisição.
        pass

    def send_error(self, code, message=None, explain=None):
        self.respond(code, {'error': HTTPStatus(code).phrase})

    def respond(self, status, payload=None, cookie=None, content_type=None, data=None):
        if data is None and payload is not None:
            data = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8')
            content_type = 'application/json; charset=utf-8'
        if data is None:
            data = b''
        self.send_response(status)
        self.send_header('Content-Type', content_type or 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Cross-Origin-Resource-Policy', 'same-site')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Vary', 'Origin')
        origin = self.headers.get('Origin')
        if origin in self.server.allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        if status == 429:
            self.send_header('Retry-After', '600')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def parsed_path(self):
        if len(self.path) > 2048 or any(ord(c) < 32 for c in self.path):
            raise APIError(400, 'URL inválida.')
        parsed = urlsplit(self.path)
        if parsed.scheme or parsed.netloc or parsed.fragment:
            raise APIError(400, 'URL inválida.')
        path = unquote(parsed.path, errors='strict')
        # Rejeita dupla codificação, separadores alternativos e qualquer travessia.
        if '%' in path or '\\' in path or '\x00' in path or path.startswith('//') or any(ord(c) < 32 for c in path):
            raise APIError(400, 'Caminho inválido.')
        if any(part.startswith('.') for part in path.split('/') if part):
            raise APIError(404, 'Arquivo não encontrado.')
        return path, parse_qs(parsed.query, keep_blank_values=True, max_num_fields=20)

    def validate_request(self):
        host = self.headers.get('Host', '')
        if len(self.headers.get_all('Host', [])) != 1 or host not in self.server.allowed_hosts:
            raise APIError(403, 'Host local não autorizado.')
        origin = self.headers.get('Origin')
        if origin is not None and origin not in self.server.allowed_origins:
            raise APIError(403, 'Origem não autorizada.')
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            raise APIError(403, 'Origem não autorizada.')
        if not origin and self.headers.get('Referer'):
            ref = urlsplit(self.headers['Referer'])
            if f'{ref.scheme}://{ref.netloc}' not in self.server.allowed_origins:
                raise APIError(403, 'Origem não autorizada.')
        self.server.app.limiter.check(('request', self.client_address[0]), 600, 60)

    def body(self):
        if self.headers.get('Transfer-Encoding'):
            raise APIError(400, 'Transferência de corpo não suportada.')
        lengths = self.headers.get_all('Content-Length', [])
        if len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,8}', lengths[0]):
            raise APIError(411, 'Informe o tamanho do corpo JSON.')
        length = int(lengths[0])
        if length > MAX_BODY:
            raise APIError(413, 'Requisição muito grande.')
        if self.headers.get_content_type() != 'application/json':
            raise APIError(415, 'Use Content-Type: application/json.')
        raw = self.rfile.read(length)
        if len(raw) != length:
            raise APIError(400, 'Corpo incompleto.')
        try:
            data = json.loads(raw.decode('utf-8'), object_pairs_hook=json_object, parse_constant=invalid_constant)
        except (ValueError, UnicodeError, RecursionError):
            raise APIError(400, 'JSON inválido.') from None
        if not isinstance(data, dict):
            raise APIError(400, 'O corpo JSON deve ser um objeto.')
        return data

    def static(self, path):
        if path == '/':
            path = '/index.html'
        parts = path.lstrip('/').split('/')
        extension = Path(parts[-1]).suffix.lower()
        allowed_root = len(parts) == 1 and parts[0] in ('index.html', 'style.css', 'portal.css', 'admin.css')
        allowed_js = len(parts) >= 2 and parts[0] == 'js' and extension == '.js'
        allowed_asset = len(parts) >= 2 and parts[0] == 'assets' and extension in (
            '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.mp3', '.ogg', '.wav', '.woff', '.woff2')
        if not (allowed_root or allowed_js or allowed_asset) or any(not p or p.startswith('.') for p in parts):
            raise APIError(404, 'Arquivo não encontrado.')
        candidate = self.server.app.root.joinpath(*parts)
        cursor = self.server.app.root
        for part in parts:
            cursor = cursor / part
            if cursor.is_symlink():
                raise APIError(404, 'Arquivo não encontrado.')
        candidate = candidate.resolve()
        if self.server.app.root not in candidate.parents or not candidate.is_file():
            raise APIError(404, 'Arquivo não encontrado.')
        content_type = mimetypes.guess_type(str(candidate))[0] or 'application/octet-stream'
        if extension in ('.js', '.css', '.html'):
            content_type += '; charset=utf-8'
        self.respond(200, content_type=content_type, data=candidate.read_bytes())

    def handle_request(self):
        try:
            self.validate_request()
            path, query = self.parsed_path()
            if self.command == 'OPTIONS':
                if not path.startswith('/api/') or self.headers.get('Access-Control-Request-Method', '') not in ('GET', 'POST'):
                    raise APIError(405, 'Método não permitido.')
                requested = {s.strip().lower() for s in self.headers.get('Access-Control-Request-Headers', '').split(',') if s.strip()}
                if requested - {'content-type', 'x-csrf-token'}:
                    raise APIError(403, 'Cabeçalho não autorizado.')
                self.respond(204)
            elif path.startswith('/api/'):
                if self.command not in ('GET', 'POST'):
                    raise APIError(405, 'Método não permitido.')
                body = self.body() if self.command == 'POST' else None
                payload, cookie = self.server.app.dispatch(self, path, query, body)
                self.respond(200, payload, cookie)
            elif self.command in ('GET', 'HEAD'):
                self.static(path)
            else:
                raise APIError(405, 'Método não permitido.')
        except APIError as error:
            self.respond(error.status, {'error': str(error)})
        except (UnicodeError, ValueError, OverflowError):
            self.respond(400, {'error': 'Requisição inválida.'})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except sqlite3.OperationalError:
            self.respond(503, {'error': 'Banco ocupado. Tente novamente.'})
        except Exception:
            print('Erro interno ao atender uma requisição; nenhum dado da requisição foi registrado.', file=sys.stderr)
            self.respond(500, {'error': 'Erro interno no servidor.'})

    do_GET = handle_request
    do_POST = handle_request
    do_HEAD = handle_request
    do_OPTIONS = handle_request
    do_PUT = handle_request
    do_DELETE = handle_request
    do_PATCH = handle_request


def create_server(root=None, private_dir=None, host='127.0.0.1', port=5501):
    if host not in ('127.0.0.1', 'localhost'):
        raise ValueError('Este servidor local aceita somente 127.0.0.1 ou localhost.')
    app = GameApplication(root or Path(__file__).resolve().parent, private_dir)
    return GameServer((host, port), app)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1', choices=('127.0.0.1', 'localhost'))
    parser.add_argument('--port', type=int, default=5501)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('porta deve estar entre 1 e 65535')
    os.umask(0o077)
    try:
        server = create_server(host=args.host, port=args.port)
    except (OSError, RuntimeError) as error:
        print(f'Não foi possível iniciar o servidor: {error}', file=sys.stderr)
        return 1
    print(f'Jogo: http://{args.host}:{server.server_port}/', flush=True)
    print(f'Conta admin inicial: {server.app.private / "admin-inicial.json"} (abra em um editor; não compartilhe).', flush=True)
    print('Para encerrar: Ctrl+C.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
