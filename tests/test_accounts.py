import concurrent.futures
from contextlib import closing
import http.client
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

class BackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (ROOT / 'server.py').exists():
            raise AssertionError('API server.py ainda não implementado')
        spec = importlib.util.spec_from_file_location('game_server_under_test', ROOT / 'server.py')
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='contas-api-')
        self.private = Path(self.tmp.name) / '.private'
        self.httpd = self.module.create_server(root=ROOT, private_dir=self.private, port=0)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.httpd.server_port
        self.cookie = ''
        self.csrf = None

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
        self.tmp.cleanup()

    def request(self, path, body=None, method=None, headers=None, cookie=None, csrf=True):
        h = dict(headers or {})
        update_session = cookie is None
        if cookie is None:
            cookie = self.cookie
        if cookie:
            h['Cookie'] = cookie
        if csrf and self.csrf:
            h['X-CSRF-Token'] = self.csrf
        data = None
        if body is not None:
            data = json.dumps(body)
            h['Content-Type'] = 'application/json'
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        conn.request(method or ('POST' if body is not None else 'GET'), path, data, h)
        r = conn.getresponse()
        raw = r.read()
        result_headers = dict(r.getheaders())
        status = r.status
        conn.close()
        if result_headers.get('Content-Type', '').startswith('application/json'):
            payload = json.loads(raw)
        else:
            payload = raw
        if result_headers.get('Set-Cookie'):
            self.cookie = result_headers['Set-Cookie'].split(';')[0]
        if update_session and isinstance(payload, dict) and 'csrf' in payload:
            self.csrf = payload['csrf']
        return status, payload, result_headers

    def register(self, username='PlayerOne'):
        status, data, headers = self.request('/api/register', {'username': username, 'password': 'SamplePass!2026'})
        self.assertEqual(status, 200, data)
        return data, headers

    def admin(self):
        creds = json.loads((self.private / 'admin-inicial.json').read_text())
        status, data, headers = self.request('/api/login', creds)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['user']['role'], 'admin')
        return data

    def age(self, run_id, seconds):
        with closing(sqlite3.connect(self.private / 'jogo.sqlite3')) as db, db:
            db.execute('UPDATE runs SET started_at=started_at-? WHERE id=?', (seconds, run_id))

    def start(self, practice=False):
        status, data, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': practice, 'stage': 'castle'})
        self.assertEqual(status, 200, data)
        return data

    def unlock_castle(self):
        status, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': 'forest'})
        self.assertEqual(status, 200, run)
        self.age(run['run_id'], 901)
        status, advanced, _ = self.request('/api/runs/advance', {'run_id': run['run_id']})
        self.assertEqual(status, 200, advanced)
        self.assertTrue(advanced['progress']['castle_unlocked'])

    def finish(self, run_id, **kwargs):
        payload = dict(run_id=run_id, kills=12, damage=123.9, duration=15.4, hero='vanguard', level=3, victory=False)
        payload.update(kwargs)
        return self.request('/api/runs/finish', payload)

    def assert_empty_profile(self, data):
        self.assertEqual(data.get('progress'), {
            'castle_unlocked': False, 'forest_clears': 0, 'castle_clears': 0,
            'catacombs_unlocked': False, 'catacombs_clears': 0})
        self.assertEqual(data.get('stats'), {
            'runs': 0, 'victories': 0, 'kills': 0, 'damage': 0, 'points': 0, 'best_points': 0})

    def test_profile_defaults_for_anonymous_and_new_account(self):
        self.assert_empty_profile(self.request('/api/session')[1])
        registered, _ = self.register()
        self.assert_empty_profile(registered)
        self.assert_empty_profile(self.request('/api/session')[1])

    def test_run_start_omitted_stage_defaults_to_forest(self):
        self.register()
        status, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False})
        self.assertEqual(status, 200, run)
        self.assertEqual(run['stage'], 'forest')

    def test_castle_lock_preserves_session_and_current_run_including_practice(self):
        registered, _ = self.register()
        status, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': 'forest'})
        self.assertEqual(status, 200, run)
        for practice in (False, True):
            status, error, headers = self.request('/api/runs/start', {
                'hero': 'vanguard', 'practice': practice, 'stage': 'castle'})
            self.assertEqual(status, 403, error)
            self.assertNotIn('Set-Cookie', headers)
            session = self.request('/api/session')[1]
            self.assertEqual(session['user']['id'], registered['user']['id'])
            self.assertEqual(session['csrf'], registered['csrf'])
            self.assert_empty_profile(session)
        with closing(self.httpd.app.connect()) as db, db:
            self.assertEqual(db.execute('SELECT state FROM runs WHERE id=?', (run['run_id'],)).fetchone()[0], 'started')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM runs').fetchone()[0], 1)

    def test_progress_advance_and_victory_are_counted_once_and_survive_account_switch(self):
        registered, _ = self.register()
        _, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': 'forest'})
        self.age(run['run_id'], 901)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            advances = list(pool.map(lambda _: self.request('/api/runs/advance', {'run_id': run['run_id']}), range(2)))
        for status, advanced, _ in advances:
            self.assertEqual(status, 200, advanced)
            self.assertEqual(advanced.get('progress'), {
                'castle_unlocked': True, 'forest_clears': 1, 'castle_clears': 0,
                'catacombs_unlocked': False, 'catacombs_clears': 0})
            self.assertEqual(advanced.get('stats', {}).get('runs'), 0)
        self.age(run['run_id'], 901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET advanced_at=advanced_at-901 WHERE id=?', (run['run_id'],))
        self.assertEqual(self.request('/api/runs/advance', {'run_id': run['run_id'], 'stage': 'catacombs'})[0], 200)
        self.age(run['run_id'], 901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET catacombs_at=catacombs_at-901 WHERE id=?', (run['run_id'],))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            finishes = list(pool.map(lambda _: self.finish(run['run_id'], duration=2701, victory=True), range(2)))
        self.assertEqual(sorted(status for status, _, _ in finishes), [200, 409])
        finished = next(data for status, data, _ in finishes if status == 200)
        profile = {'castle_unlocked': True, 'forest_clears': 1, 'castle_clears': 1,
                   'catacombs_unlocked': True, 'catacombs_clears': 1}
        self.assertEqual(finished.get('progress'), profile)
        self.assertEqual(finished.get('stats'), {
            'runs': 1, 'victories': 1, 'kills': 12, 'damage': 123.9, 'points': 33456, 'best_points': 33456})
        app = self.module.GameApplication(ROOT, self.private)
        with closing(app.connect()) as db, db:
            persisted = app.session_payload(db, app.session(db, self.cookie))
        self.assertEqual(persisted['progress'], profile)
        self.assertEqual(persisted['stats'], finished['stats'])
        self.request('/api/logout', {})
        second, _ = self.register('PlayerTwo')
        self.assertNotEqual(registered['user']['id'], second['user']['id'])
        self.assert_empty_profile(second)
        self.assertEqual(self.request('/api/runs/start', {
            'hero': 'vanguard', 'practice': False, 'stage': 'castle'})[0], 403)
        self.assert_empty_profile(self.admin())
        status, logged_in, _ = self.request('/api/login', {'username': 'PlayerOne', 'password': 'SamplePass!2026'})
        self.assertEqual(status, 200, logged_in)
        self.assertEqual(logged_in['progress'], profile)
        self.assertEqual(logged_in['stats'], finished['stats'])
        self.assertEqual(self.request('/api/runs/start', {
            'hero': 'vanguard', 'practice': True, 'stage': 'castle'})[0], 200)

    def test_custom_rules_require_valid_stage_times_and_grant_progress_without_ranked_stats(self):
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE settings SET value_json=? WHERE id=1', (
                json.dumps({**self.module.DEFAULT_SETTINGS, 'bossTime': 30}),))
        self.register()
        _, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': 'forest'})
        self.assertFalse(run['ranked'])
        self.assertEqual(self.request('/api/runs/advance', {'run_id': run['run_id']})[0], 400)
        self.age(run['run_id'], 31)
        status, advanced, _ = self.request('/api/runs/advance', {'run_id': run['run_id']})
        self.assertEqual(status, 200, advanced)
        self.assertEqual(advanced.get('progress'), {
            'castle_unlocked': True, 'forest_clears': 1, 'castle_clears': 0,
            'catacombs_unlocked': False, 'catacombs_clears': 0})
        self.assertEqual(self.finish(run['run_id'], duration=60, victory=True)[0], 400)
        self.age(run['run_id'], 31)
        # Total elapsed alone cannot prove that the castle itself was completed.
        self.assertEqual(self.finish(run['run_id'], duration=61, victory=True)[0], 400)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET advanced_at=advanced_at-31 WHERE id=?', (run['run_id'],))
        self.assertEqual(self.request('/api/runs/advance', {'run_id': run['run_id'], 'stage': 'catacombs'})[0], 200)
        self.assertEqual(self.finish(run['run_id'], duration=90, victory=True)[0], 400)
        self.age(run['run_id'], 31)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET catacombs_at=catacombs_at-31 WHERE id=?', (run['run_id'],))
        status, finished, _ = self.finish(run['run_id'], duration=91, victory=True)
        self.assertEqual(status, 200, finished)
        self.assertFalse(finished['ranked'])
        self.assertEqual(finished.get('progress'), {
            'castle_unlocked': True, 'forest_clears': 1, 'castle_clears': 1,
            'catacombs_unlocked': True, 'catacombs_clears': 1})
        self.assertEqual(finished.get('stats'), {
            'runs': 0, 'victories': 0, 'kills': 0, 'damage': 0, 'points': 0, 'best_points': 0})

    def test_practice_and_admin_results_do_not_grant_player_progress(self):
        self.register()
        _, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': True, 'stage': 'forest'})
        status, advanced, _ = self.request('/api/runs/advance', {'run_id': run['run_id']})
        self.assertEqual(status, 200, advanced)
        self.assert_empty_profile(advanced)
        self.assertEqual(self.request('/api/runs/advance', {'run_id': run['run_id'], 'stage': 'catacombs'})[0], 200)
        self.age(run['run_id'], 2701)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET advanced_at=advanced_at-901 WHERE id=?', (run['run_id'],))
        status, finished, _ = self.finish(run['run_id'], duration=2700, victory=True)
        self.assertEqual(status, 200, finished)
        self.assert_empty_profile(finished)
        self.assert_empty_profile(self.admin())
        for stage in ('forest', 'castle', 'catacombs'):
            status, run, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': stage})
            self.assertEqual(status, 200, run)
            self.assertFalse(run['ranked'])
            self.age(run['run_id'], 901)
            if stage == 'forest':
                self.assert_empty_profile(self.request('/api/runs/advance', {'run_id': run['run_id']})[1])
                self.age(run['run_id'], 901)
                with closing(self.httpd.app.connect()) as db, db:
                    db.execute('UPDATE runs SET advanced_at=advanced_at-901 WHERE id=?', (run['run_id'],))
            if stage != 'catacombs':
                self.assert_empty_profile(self.request('/api/runs/advance', {'run_id': run['run_id'], 'stage': 'catacombs'})[1])
                self.age(run['run_id'], 901)
            duration = 900 * (3 - ('forest', 'castle', 'catacombs').index(stage))
            status, finished, _ = self.finish(run['run_id'], duration=duration, victory=True)
            self.assertEqual(status, 200, finished)
            self.assert_empty_profile(finished)
        self.httpd.app.initialize()
        self.assert_empty_profile(self.request('/api/session')[1])

    def test_stats_sum_all_completed_ranked_runs_across_difficulties(self):
        self.register()
        _, forest, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': False, 'stage': 'forest'})
        self.age(forest['run_id'], 901)
        self.assertEqual(self.request('/api/runs/advance', {'run_id': forest['run_id']})[0], 200)
        for difficulty, victory, duration, kills, damage, points in (
                ('medium', False, 20, 2, 10.5, 420), ('easy', True, 1800, 3, 20.25, 17505)):
            status, run, _ = self.request('/api/runs/start', {
                'hero': 'vanguard', 'practice': False, 'stage': 'castle', 'difficulty': difficulty})
            self.assertEqual(status, 200, run)
            self.age(run['run_id'], 901 if victory else duration + 1)
            if victory:
                self.assertEqual(self.request('/api/runs/advance', {'run_id':run['run_id'],'stage':'catacombs'})[0],200)
                self.age(run['run_id'],901)
                with closing(self.httpd.app.connect()) as db, db:
                    db.execute('UPDATE runs SET catacombs_at=catacombs_at-901 WHERE id=?',(run['run_id'],))
            status, finished, _ = self.finish(run['run_id'], duration=duration, kills=kills, damage=damage, victory=victory)
            self.assertEqual(status, 200, finished)
            self.assertEqual(finished['points'], points)
        _, practice, _ = self.request('/api/runs/start', {'hero': 'vanguard', 'practice': True, 'stage': 'castle'})
        self.age(practice['run_id'], 21)
        self.assertEqual(self.finish(practice['run_id'], duration=20, kills=99, damage=99)[0], 200)
        stats = self.request('/api/session')[1].get('stats')
        self.assertEqual(stats, {'runs': 2, 'victories': 1, 'kills': 5, 'damage': 30.75, 'points': 17925, 'best_points': 17505})

    def test_profile_migration_accepts_legitimate_legacy_results_without_rewriting_accounts_or_scores(self):
        registered, _ = self.register()
        player_id = registered['user']['id']
        with closing(self.httpd.app.connect()) as db, db:
            original_hash = db.execute('SELECT password_hash FROM users WHERE id=?', (player_id,)).fetchone()[0]
            admin_id = db.execute("SELECT id FROM users WHERE role='admin'").fetchone()[0]
        for has_stages in (False, True):
            with self.subTest(has_stages=has_stages):
                private = Path(self.tmp.name) / ('legacy-stages' if has_stages else 'legacy-castle')
                private.mkdir(mode=0o700)
                with closing(self.httpd.app.connect()) as source, source, closing(sqlite3.connect(private / 'jogo.sqlite3')) as db, db:
                    source.backup(db)
                    db.execute('DROP TABLE runs')
                    stage_columns = ",start_stage TEXT NOT NULL DEFAULT 'castle',current_stage TEXT NOT NULL DEFAULT 'castle',advanced_at REAL" if has_stages else ''
                    db.execute('''CREATE TABLE runs (
                        id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,hero TEXT NOT NULL,
                        practice INTEGER NOT NULL,ranked INTEGER NOT NULL,started_at REAL NOT NULL,
                        finished_at REAL,state TEXT NOT NULL,settings_json TEXT NOT NULL,
                        kills INTEGER,damage REAL,duration REAL,level INTEGER,victory INTEGER,points INTEGER
                    ''' + stage_columns + ')')
                    for run_id, owner, practice, ranked, duration, finished_at, points in (
                            ('a' * 32, player_id, 0, 1, 1801 if has_stages else 900, 2802 if has_stages else 1901, 24456 if has_stages else 15446),
                            ('b' * 32, player_id, 1, 0, 1801 if has_stages else 900, 2802 if has_stages else 1901, 123),
                            ('c' * 32, player_id, 0, 0, 1, 1002, 456),
                            ('d' * 32, admin_id, 0, 0, 1801 if has_stages else 900, 2802 if has_stages else 1901, 789)):
                        db.execute('''INSERT INTO runs(id,user_id,hero,practice,ranked,started_at,finished_at,state,
                            settings_json,kills,damage,duration,level,victory,points)
                            VALUES(?,?,'vanguard',?,?,1000,?,'finished',?,12,123.9,?,3,1,?)''',
                            (run_id, owner, practice, ranked, finished_at, json.dumps(self.module.DEFAULT_SETTINGS), duration, points))
                        if has_stages:
                            db.execute("UPDATE runs SET start_stage='forest',current_stage='castle',advanced_at=? WHERE id=?",
                                       (1001 if run_id == 'c' * 32 else 1901, run_id))
                    if has_stages:
                        db.execute('''INSERT INTO runs(id,user_id,hero,practice,ranked,started_at,finished_at,state,
                            settings_json,kills,damage,duration,level,victory,points,start_stage,current_stage,advanced_at)
                            VALUES(?,?,'vanguard',0,0,1000,1062,'finished',?,1,0,61,1,1,5710,'forest','castle',1031)''',
                            ('e' * 32, player_id, json.dumps({**self.module.DEFAULT_SETTINGS, 'bossTime': 30})))
                    previous_results = db.execute('SELECT id,points FROM runs ORDER BY id').fetchall()
                app = self.module.GameApplication(ROOT, private)
                app.initialize()
                with closing(app.connect()) as db, db:
                    profile = app.session_payload(db, app.session(db, self.cookie))
                    self.assertEqual(profile.get('progress'), {
                        'castle_unlocked': True, 'forest_clears': 2 if has_stages else 0, 'castle_clears': 2 if has_stages else 1,
                        'catacombs_unlocked': True, 'catacombs_clears': 0})
                    self.assertEqual(profile.get('stats', {}).get('runs'), 1)
                    self.assertEqual(db.execute('SELECT password_hash FROM users WHERE id=?', (player_id,)).fetchone()[0], original_hash)
                    self.assertEqual([tuple(row) for row in db.execute('SELECT id,points FROM runs ORDER BY id')], previous_results)
                    self.assertEqual(db.execute('SELECT start_stage FROM runs WHERE id=?', ('a' * 32,)).fetchone()[0], 'forest' if has_stages else 'castle')

    def test_session_hash_password_validation_and_cookie(self):
        status, data, _ = self.request('/api/session')
        self.assertEqual((status, data['user'], data['csrf']), (200, None, None))
        data, headers = self.register()
        self.assertEqual(data['user']['role'], 'player')
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Lax', headers['Set-Cookie'])
        with closing(sqlite3.connect(self.private / 'jogo.sqlite3')) as db, db:
            row = db.execute('SELECT password_hash FROM users WHERE id=?', (data['user']['id'],)).fetchone()
            self.assertNotIn('SamplePass!2026', row[0])
            self.assertIn('600000', row[0])
            session_hash = db.execute('SELECT token_hash FROM sessions WHERE user_id=?', (data['user']['id'],)).fetchone()[0]
            self.assertNotEqual(session_hash, self.cookie.split('=', 1)[1])
        self.assertEqual(self.request('/api/admin/users')[0], 403)
        self.assertEqual(self.request('/api/admin/command', {'command': 'god', 'args': {'enabled': True}})[0], 403)
        self.assertEqual(self.request('/api/logout', {}, csrf=False)[0], 403)
        self.assertEqual(self.request('/api/logout', {})[0], 200)
        self.assertEqual(self.request('/api/session')[1]['user'], None)
        self.assertEqual(self.request('/api/login', {'username': 'playerone', 'password': 'SamplePass!2026'})[0], 200)
        self.assertEqual(self.request('/api/password', {'currentPassword': 'wrong', 'newPassword': 'DifferentPass!2026'})[0], 400)
        self.assertEqual(self.request('/api/password', {'currentPassword': 'SamplePass!2026', 'newPassword': 'DifferentPass!2026'})[0], 200)

    def test_registration_rejects_forged_role_duplicates_and_length(self):
        self.assertEqual(self.request('/api/register', {'username':'abc', 'password':'SamplePass!2026', 'role':'admin'})[0], 400)
        self.assertEqual(self.request('/api/register', {'username':'x'*21, 'password':'SamplePass!2026'})[0], 400)
        self.assertEqual(self.request('/api/register', {'username':'xx', 'password':'SamplePass!2026'})[0], 400)
        self.assertEqual(self.request('/api/register', {'username':'abc', 'password':'short'})[0], 400)
        self.register()
        self.request('/api/logout', {})
        self.assertEqual(self.request('/api/register', {'username':'playerone', 'password':'SamplePass!2026'})[0], 409)

    def test_scores_compute_points_reject_replay_and_unreal_time(self):
        self.assertEqual(self.request('/api/runs/start', {'hero':'vanguard', 'practice':False})[0], 401)
        self.register()
        self.unlock_castle()
        run = self.start()
        self.assertTrue(run['ranked'])
        self.assertEqual(self.finish(run['run_id'], duration=9999)[0], 400)
        self.age(run['run_id'], 30)
        status, data, _ = self.finish(run['run_id'])
        self.assertEqual(status, 200, data)
        self.assertEqual(data, {'saved': True, 'ranked': True, 'points': 1596,
            'progress': {'castle_unlocked': True, 'forest_clears': 1, 'castle_clears': 0,
                         'catacombs_unlocked': False, 'catacombs_clears': 0},
            'stats': {'runs': 1, 'victories': 0, 'kills': 12, 'damage': 123.9, 'points': 1596, 'best_points': 1596}})
        self.assertEqual(self.finish(run['run_id'])[0], 409)
        entries = self.request('/api/leaderboard?sort=points')[1]['entries']
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['points'], 1596)
        self.assertEqual(entries[0]['rank'], 1)
        run = self.start(practice=True)
        self.age(run['run_id'], 30)
        self.assertFalse(self.finish(run['run_id'])[1]['ranked'])
        self.assertEqual(len(self.request('/api/leaderboard')[1]['entries']), 1)

    def test_scores_reject_other_owner_bad_numbers_and_hero(self):
        self.register()
        self.unlock_castle()
        original_cookie, original_csrf = self.cookie, self.csrf
        run = self.start()
        self.request('/api/logout', {})
        self.register('PlayerTwo')
        self.assertEqual(self.finish(run['run_id'])[0], 404)
        self.request('/api/logout', {})
        self.request('/api/login', {'username':'PlayerOne', 'password':'SamplePass!2026'})
        run = self.start()
        self.age(run['run_id'], 30)
        for bad in ({'damage':-1}, {'kills':True}, {'hero':'mage'}, {'level':101}, {'victory':1}, {'damage':float('nan')}, {'kills':2.5}):
            self.assertEqual(self.finish(run['run_id'], **bad)[0], 400, bad)
        self.assertEqual(self.finish(run['run_id'])[0], 200)

    def test_logout_and_account_switch_cannot_restore_ranked_run_after_admin_cheats(self):
        for logout_first in (False, True):
            if not self.cookie:
                self.register()
                self.unlock_castle()
            else:
                self.request('/api/login', {'username':'PlayerOne','password':'SamplePass!2026'})
            run = self.start()
            self.assertTrue(run['ranked'])
            self.age(run['run_id'],30)
            if logout_first:
                self.assertEqual(self.request('/api/logout',{})[0],200)
            self.admin()
            self.assertEqual(self.request('/api/admin/command',{'command':'god','args':{'enabled':True}})[0],200)
            self.assertEqual(self.request('/api/login',{'username':'PlayerOne','password':'SamplePass!2026'})[0],200)
            self.assertEqual(self.finish(run['run_id'])[0],409)
            self.assertEqual(self.request('/api/leaderboard')[1]['entries'],[])

    def test_run_finish_requires_original_session_even_for_same_account(self):
        self.register()
        self.unlock_castle()
        original_cookie, original_csrf = self.cookie,self.csrf
        run = self.start(); self.age(run['run_id'],30)
        self.cookie=''; self.csrf=None
        self.assertEqual(self.request('/api/login',{'username':'PlayerOne','password':'SamplePass!2026'})[0],200)
        self.assertEqual(self.finish(run['run_id'])[0],409)
        self.cookie,self.csrf=original_cookie,original_csrf
        self.assertEqual(self.finish(run['run_id'])[0],200)

    def test_registering_another_account_invalidates_previous_session_run(self):
        self.register()
        self.unlock_castle()
        run=self.start(); self.age(run['run_id'],30)
        self.register('PlayerTwo')
        self.assertEqual(self.request('/api/login',{'username':'PlayerOne','password':'SamplePass!2026'})[0],200)
        self.assertEqual(self.finish(run['run_id'])[0],409)
        self.assertEqual(self.request('/api/leaderboard')[1]['entries'],[])

    def test_legacy_runs_migrate_without_restoring_unbound_open_scores(self):
        legacy=Path(self.tmp.name)/'legacy-data'
        legacy.mkdir(mode=0o700)
        with closing(sqlite3.connect(legacy/'jogo.sqlite3')) as db, db:
            db.execute('''CREATE TABLE runs (
                id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,hero TEXT NOT NULL,
                practice INTEGER NOT NULL,ranked INTEGER NOT NULL,started_at REAL NOT NULL,
                finished_at REAL,state TEXT NOT NULL DEFAULT 'started',settings_json TEXT NOT NULL,
                kills INTEGER,damage REAL,duration REAL,level INTEGER,victory INTEGER,points INTEGER)''')
            db.execute('''INSERT INTO runs(id,user_id,hero,practice,ranked,started_at,settings_json)
                VALUES(?,1,'vanguard',0,1,0,'{}')''',('x'*32,))
            db.execute('''INSERT INTO runs(id,user_id,hero,practice,ranked,started_at,settings_json,state,points)
                VALUES(?,1,'vanguard',0,1,0,'{}','finished',1234)''',('y'*32,))
        app=self.module.GameApplication(ROOT,legacy)
        with closing(app.connect()) as db, db:
            row=db.execute('SELECT state,ranked,session_hash FROM runs WHERE id=?',('x'*32,)).fetchone()
            self.assertEqual(tuple(row),('abandoned',0,None))
            self.assertEqual(db.execute('SELECT points FROM runs WHERE id=?',('y'*32,)).fetchone()[0],1234)

    def test_difficulty_is_bound_to_run_and_rankings_are_separate(self):
        self.register()
        self.unlock_castle()
        for difficulty, multiplier in [('easy', .75), ('medium', 1), ('hard', 1.5), ('hardcore', 2.5)]:
            status, run, _ = self.request('/api/runs/start', {'hero':'vanguard','practice':False,'difficulty':difficulty,'stage':'castle'})
            self.assertEqual(status, 200, run)
            self.assertEqual(run['difficulty'], difficulty)
            self.assertEqual(run['settings']['bossTime'], 900)
            self.age(run['run_id'], 15)
            status, result, _ = self.finish(run['run_id'], kills=1, damage=10, duration=15)
            self.assertEqual(status, 200, result)
            self.assertEqual(result['points'], int(270 * multiplier))
            entries = self.request('/api/leaderboard?difficulty=' + difficulty)[1]['entries']
            self.assertEqual(len(entries), 1)
            self.assertEqual(entries[0]['difficulty'], difficulty)
            self.assertEqual(entries[0]['points'], int(270 * multiplier))
        self.assertEqual(len(self.request('/api/leaderboard')[1]['entries']), 1)
        self.assertEqual(self.request('/api/leaderboard?difficulty=impossible')[0], 400)
        self.assertEqual(self.request('/api/leaderboard?difficulty=easy&difficulty=hard')[0], 400)
        self.assertEqual(self.request('/api/runs/start', {'hero':'mage','practice':False,'difficulty':'bad'})[0], 400)
        run = self.start()
        self.assertEqual(run['difficulty'], 'medium')
        self.assertEqual(self.finish(run['run_id'], difficulty='hardcore')[0], 400)
        self.age(run['run_id'], 540)
        self.assertEqual(self.finish(run['run_id'], duration=540, victory=True)[0], 400)

    def test_stage_migration_preserves_custom_settings_and_legacy_scores(self):
        legacy = {**self.module.DEFAULT_SETTINGS, 'bossTime':540}
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE settings SET value_json=? WHERE id=1', (json.dumps(legacy),))
        self.httpd.app.initialize()
        self.assertEqual(self.request('/api/session')[1]['settings']['bossTime'], 900)
        custom = {**legacy, 'bossTime':30}
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE settings SET value_json=? WHERE id=1', (json.dumps(custom),))
        self.httpd.app.initialize()
        self.assertEqual(self.request('/api/session')[1]['settings']['bossTime'], 30)

    def test_campaign_stage_advance_and_final_victory(self):
        self.register()
        status, run, _ = self.request('/api/runs/start', {'hero':'vanguard','practice':False,'stage':'forest'})
        self.assertEqual(status,200,run)
        self.assertEqual(run['stage'],'forest')
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id']})[0],400)
        self.age(run['run_id'],901)
        self.assertEqual(self.finish(run['run_id'],duration=900,victory=True)[0],400)
        status,advanced,_=self.request('/api/runs/advance',{'run_id':run['run_id']})
        self.assertEqual((status,advanced['stage']),(200,'castle'))
        with closing(self.httpd.app.connect()) as db, db:
            first=db.execute('SELECT advanced_at FROM runs WHERE id=?',(run['run_id'],)).fetchone()[0]
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id']})[0],200)
        with closing(self.httpd.app.connect()) as db, db:
            self.assertEqual(db.execute('SELECT advanced_at FROM runs WHERE id=?',(run['run_id'],)).fetchone()[0],first)
        self.assertEqual(self.finish(run['run_id'],duration=900,victory=True)[0],400)
        self.age(run['run_id'],901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET advanced_at=advanced_at-901 WHERE id=?',(run['run_id'],))
        self.assertEqual(self.finish(run['run_id'],duration=1801,victory=True)[0],400)
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id'],'stage':'catacombs'})[0],200)
        self.age(run['run_id'],901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET catacombs_at=catacombs_at-901 WHERE id=?',(run['run_id'],))
        self.assertEqual(self.finish(run['run_id'],duration=2701,victory=True)[0],200)
        rows=self.request('/api/leaderboard?stage=forest')[1]['entries']
        self.assertEqual((len(rows),rows[0]['stage']),(1,'forest'))
        self.assertEqual(self.request('/api/leaderboard?stage=castle')[1]['entries'],[])
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id']})[0],409)

    def test_campaign_stage_validation_and_practice(self):
        self.register()
        self.unlock_castle()
        self.assertEqual(self.request('/api/runs/start',{'hero':'mage','practice':False,'stage':'bogus'})[0],400)
        self.assertEqual(self.request('/api/leaderboard?stage=bogus')[0],400)
        self.assertEqual(self.request('/api/leaderboard?stage=forest&stage=castle')[0],400)
        castle=self.start()
        self.assertEqual(castle['stage'],'castle')
        self.assertEqual(self.request('/api/runs/advance',{'run_id':castle['run_id']})[0],400)
        status,run,_=self.request('/api/runs/start',{'hero':'mage','practice':True,'stage':'forest'})
        self.assertEqual(status,200,run)
        self.assertFalse(run['ranked'])
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id']})[0],200)
        self.request('/api/logout',{})
        self.request('/api/login',{'username':'PlayerOne','password':'SamplePass!2026'})
        self.assertEqual(self.request('/api/runs/advance',{'run_id':run['run_id']})[0],409)

    def test_run_start_returns_authoritative_settings_snapshot(self):
        self.admin()
        settings={'healthDropChance':.2,'bossTime':30,'spawnBaseRate':1,'spawnGrowth':.01,'maxEnemies':120}
        self.assertEqual(self.request('/api/admin/settings',settings)[0],200)
        self.assertEqual(self.request('/api/logout',{})[0],200)
        self.register()
        self.unlock_castle()
        run=self.start()
        self.assertEqual(run.get('settings'),settings)
        self.assertFalse(run['ranked'])
        with closing(sqlite3.connect(self.private/'jogo.sqlite3')) as db, db:
            stored=json.loads(db.execute('SELECT settings_json FROM runs WHERE id=?',(run['run_id'],)).fetchone()[0])
        self.assertEqual(stored,run['settings'])

    def test_private_storage_is_outside_static_root_and_respects_environment(self):
        static=Path(self.tmp.name)/'site'
        static.mkdir()
        for location in (static,static/'.private',static/'nested'/'secrets'):
            with self.assertRaises(RuntimeError):
                self.module.GameApplication(static,location)
        self.assertFalse((static/'.private').exists())
        with patch.dict(os.environ,{'MURALHA_DATA_DIR':'','XDG_DATA_HOME':str(Path(self.tmp.name)/'xdg')}):
            app=self.module.GameApplication(static)
            self.assertEqual(app.private,Path(self.tmp.name)/'xdg'/'a-ultima-muralha')
        custom=Path(self.tmp.name)/'custom-data'
        with patch.dict(os.environ,{'MURALHA_DATA_DIR':str(custom)}):
            app=self.module.GameApplication(static)
            self.assertEqual(app.private,custom)

    def test_leaderboard_best_per_user_sort_and_admin_exclusion(self):
        self.register()
        self.unlock_castle()
        for kills, damage in ((15,100), (2,1000)):
            r = self.start(); self.age(r['run_id'],30)
            self.assertEqual(self.finish(r['run_id'],kills=kills,damage=damage)[0],200)
        self.assertEqual(self.request('/api/leaderboard?sort=kills')[1]['entries'][0]['kills'],15)
        self.assertEqual(self.request('/api/leaderboard?sort=damage')[1]['entries'][0]['damage'],1000)
        self.request('/api/logout', {})
        self.admin()
        r = self.start(); self.age(r['run_id'],30)
        self.assertFalse(r['ranked'])
        self.assertFalse(self.finish(r['run_id'])[1]['ranked'])
        self.assertEqual(len(self.request('/api/leaderboard')[1]['entries']),1)
        self.assertEqual(self.request('/api/leaderboard?sort=oops')[0],400)

    def test_admin_ban_revokes_sessions_and_hides_scores(self):
        user, _ = self.register()
        self.unlock_castle()
        r = self.start(); self.age(r['run_id'],30); self.finish(r['run_id'])
        user_cookie = self.cookie
        self.cookie=''; self.csrf=None
        admin = self.admin()
        self.assertEqual(self.request('/api/admin/ban', {'user_id':admin['user']['id'], 'banned':True, 'reason':'test'})[0],400)
        self.assertEqual(self.request('/api/admin/ban', {'user_id':user['user']['id'], 'banned':True, 'reason':'teste'})[0],200)
        self.assertEqual(self.request('/api/session',cookie=user_cookie)[1]['user'],None)
        self.assertEqual(self.request('/api/leaderboard')[1]['entries'],[])
        self.assertEqual(self.request('/api/login', {'username':'PlayerOne','password':'SamplePass!2026'})[0],403)
        self.assertEqual(self.request('/api/admin/ban', {'user_id':user['user']['id'], 'banned':False,'reason':'liberado'})[0],200)
        self.assertEqual(len(self.request('/api/leaderboard')[1]['entries']),1)
        with closing(sqlite3.connect(self.private/'jogo.sqlite3')) as db, db:
            self.assertGreaterEqual(db.execute('SELECT COUNT(*) FROM audit').fetchone()[0],2)

    def test_admin_command_schema_and_settings(self):
        self.admin()
        valid = [
            ('stats',{'hp':100,'maxHp':200,'speed':150,'damage':1,'rate':1,'area':1,'range':1}),
            ('spawn',{'enemy':'bat','count':2}), ('power',{'id':'slash','level':8}),
            *[('spawn',{'enemy':enemy,'count':2}) for enemy in (
                'forest_boar', 'forest_snake', 'forest_raven', 'forest_sentinel')],
            ('level',{'level':3}),('xp',{'amount':20}),('teleport',{'x':150,'y':3850}),
            ('god',{'enabled':True}),('spawning',{'enabled':False}),
            *[(name,{}) for name in ['heal','boss','clear','maxpowers','killboss']]
        ]
        for command,args in valid:
            self.assertEqual(self.request('/api/admin/command',{'command':command,'args':args})[:2],(200,{'command':command,'args':args}))
        for command,args in [('spawn',{'enemy':'garbage','count':2}),('spawn',{'enemy':'bat','count':241}),('power',{'id':'slash','level':9}),('god',{'enabled':'yes'}),('heal',{'extra':1}),('stats',{'speed':1501}),('unknown',{}),('stats',{'hp':float('inf')})]:
            self.assertEqual(self.request('/api/admin/command',{'command':command,'args':args})[0],400)
        settings = {'healthDropChance':.2,'bossTime':30,'spawnBaseRate':1,'spawnGrowth':.01,'maxEnemies':120}
        self.assertEqual(self.request('/api/admin/settings',settings)[:2],(200,{'settings':settings}))
        self.assertEqual(self.request('/api/session')[1]['settings'],settings)
        self.assertEqual(self.request('/api/admin/settings',{**settings,'maxEnemies':241})[0],400)

    def test_catacombs_campaign_requires_two_explicit_idempotent_passages(self):
        self.register()
        self.assertEqual(self.request('/api/runs/start', {'hero': 'channeler', 'practice': False, 'stage': 'catacombs'})[0], 403)
        status, run, _ = self.request('/api/runs/start', {'hero': 'channeler', 'practice': False, 'stage': 'forest'})
        self.assertEqual(status, 200, run)
        self.assertEqual(run.get('campaign_version'), 3)
        target = lambda stage: self.request('/api/runs/advance', {'run_id': run['run_id'], 'stage': stage})
        self.assertEqual(target('catacombs')[0], 400, 'Cannot skip castle')
        self.age(run['run_id'], 901)
        self.assertEqual(target('castle')[0], 200)
        self.assertEqual(target('catacombs')[0], 400, 'Castle needs its own elapsed time')
        self.age(run['run_id'], 901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET advanced_at=advanced_at-901 WHERE id=?', (run['run_id'],))
        self.assertEqual(self.finish(run['run_id'], hero='channeler', duration=1801, victory=True)[0], 400)
        status, advanced, _ = target('catacombs')
        self.assertEqual((status, advanced.get('stage')), (200, 'catacombs'), advanced)
        self.assertTrue(advanced['progress']['catacombs_unlocked'])
        self.assertEqual(advanced['progress']['castle_clears'], 1)
        with closing(self.httpd.app.connect()) as db, db:
            first = db.execute('SELECT catacombs_at FROM runs WHERE id=?', (run['run_id'],)).fetchone()[0]
        self.assertEqual(target('catacombs')[0], 200)
        self.assertEqual(target('castle')[0], 409, 'An earlier retry must not change current phase')
        with closing(self.httpd.app.connect()) as db, db:
            self.assertEqual(db.execute('SELECT catacombs_at FROM runs WHERE id=?', (run['run_id'],)).fetchone()[0], first)
        self.assertEqual(self.finish(run['run_id'], hero='channeler', duration=1801, victory=True)[0], 400)
        self.age(run['run_id'], 901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET catacombs_at=catacombs_at-901 WHERE id=?', (run['run_id'],))
        status, result, _ = self.finish(run['run_id'], hero='channeler', duration=2701, victory=True)
        self.assertEqual(status, 200, result)
        self.assertEqual(result['progress']['catacombs_clears'], 1)
        self.assertEqual(result['progress']['castle_clears'], 1)
        self.assertEqual(self.request('/api/session')[1]['progress'], result['progress'])

    def test_catacombs_legacy_victory_unlocks_without_rewriting_results(self):
        self.register()
        self.unlock_castle()
        run = self.start()
        self.age(run['run_id'], 901)
        with closing(self.httpd.app.connect()) as db, db:
            db.execute('UPDATE runs SET campaign_version=2 WHERE id=?', (run['run_id'],))
        status, result, _ = self.finish(run['run_id'], duration=900, victory=True)
        self.assertEqual(status, 200, result)
        self.assertTrue(result['progress']['catacombs_unlocked'])
        self.assertEqual(result['progress']['catacombs_clears'], 0)
        app = self.module.GameApplication(ROOT, self.private)
        with closing(app.connect()) as db:
            historical = db.execute('SELECT victory,current_stage,campaign_version FROM runs WHERE id=?', (run['run_id'],)).fetchone()
            self.assertEqual(tuple(historical), (1, 'castle', 2))
        self.assertEqual(self.request('/api/runs/start', {'hero': 'mage', 'practice': False, 'stage': 'catacombs'})[0], 200)

    def test_channeler_can_start_and_finish_an_authenticated_run(self):
        self.register('CanalizadorTeste')
        status, run, _ = self.request('/api/runs/start', {
            'hero': 'channeler', 'practice': True, 'stage': 'forest'})
        self.assertEqual(status, 200, run)
        status, result, _ = self.finish(run['run_id'], hero='channeler',
                                      kills=0, damage=0, duration=0, level=1)
        self.assertEqual(status, 200, result)
        self.assertTrue(result['saved'])
        self.assertFalse(result['ranked'])

    def test_admin_can_use_new_powers_and_forest_creatures(self):
        self.admin()
        for power in ('cyclone', 'radiant_beam', 'plasma', 'meteor'):
            body = {'command': 'power', 'args': {'id': power, 'level': 8}}
            self.assertEqual(self.request('/api/admin/command', body)[:2], (200, body))
        for enemy in ('forest_witch', 'forest_storm_mage'):
            body = {'command': 'spawn', 'args': {'enemy': enemy, 'count': 2}}
            self.assertEqual(self.request('/api/admin/command', body)[:2], (200, body))

    def test_concurrent_finish_saves_once_and_password_revokes_other_session(self):
        self.register()
        self.unlock_castle()
        other_cookie = self.cookie
        self.cookie = ''; self.csrf = None
        self.request('/api/login', {'username':'PlayerOne','password':'SamplePass!2026'})
        r = self.start(); self.age(r['run_id'],30)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda _: self.finish(r['run_id'])[0], range(2)))
        self.assertEqual(sorted(statuses),[200,409])
        self.assertEqual(self.request('/api/password', {'currentPassword':'SamplePass!2026','newPassword':'ChangedPass!2026'})[0],200)
        self.assertEqual(self.request('/api/session',cookie=other_cookie)[1]['user'],None)
        self.assertEqual(self.request('/api/session')[1]['user']['username'],'PlayerOne')
        self.assertEqual(self.request('/api/logout',{},headers={'X-CSRF-Token':'é'},csrf=False)[0],403)

    def test_persists_account_sessions_settings_without_reseeding_admin(self):
        self.register()
        self.unlock_castle()
        r=self.start(); self.age(r['run_id'],30); self.finish(r['run_id'])
        existing = (self.private/'admin-inicial.json').read_bytes()
        app = self.module.GameApplication(ROOT,self.private)
        self.assertEqual((self.private/'admin-inicial.json').read_bytes(),existing)
        with closing(app.connect()) as db, db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0],1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM runs WHERE state='finished'").fetchone()[0],1)
            self.assertEqual(app.session(db,self.cookie)['username'],'PlayerOne')
        (self.private/'admin-inicial.json').unlink()
        self.module.GameApplication(ROOT,self.private)
        self.assertFalse((self.private/'admin-inicial.json').exists())

    def test_rate_limit_json_validation_and_body_size(self):
        for _ in range(12):
            self.assertEqual(self.request('/api/login',{'username':'NoSuchUser','password':'SamplePass!2026'})[0],401)
        self.assertEqual(self.request('/api/login',{'username':'NoSuchUser','password':'SamplePass!2026'})[0],429)
        for raw,status in [('[]',400),('{"username":"one","username":"two","password":"SamplePass!2026"}',400),('{"test":NaN}',400),('x'*16385,413)]:
            conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=10)
            conn.request('POST','/api/register',raw,{'Content-Type':'application/json'})
            r=conn.getresponse(); r.read(); self.assertEqual(r.status,status); conn.close()

    def test_static_and_cors_exclude_secrets_and_traversal(self):
        for path in ['/.private/admin-inicial.json','/server.py','/docs/contas-plano.md','/.git/config','/%2eprivate/admin-inicial.json','/%2e%2e/server.py','/js/%2e%2e/server.py','/%252eprivate/admin-inicial.json','/js/../server.py','//server.py','/js/%2f../server.py','/INICIAR-JOGO.sh']:
            self.assertIn(self.request(path)[0],(400,403,404),path)
        self.assertEqual(self.request('/')[0],200)
        self.assertEqual(self.request('/js/config.js')[0],200)
        self.assertEqual(self.request('/api/session',headers={'Origin':'https://evil.example'})[0],403)
        status,_,headers = self.request('/api/session',headers={'Origin':'http://localhost:5500'})
        self.assertEqual(status,200)
        self.assertEqual(headers['Access-Control-Allow-Origin'],'http://localhost:5500')
        self.assertEqual(headers['Access-Control-Allow-Credentials'],'true')
        self.assertEqual(self.request('/api/session',headers={'Host':'evil.example'})[0],403)
        self.assertEqual(self.request('/api/register',method='OPTIONS',headers={'Origin':'http://127.0.0.1:5500','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-csrf-token'})[0],204)
        # Windows não representa permissões POSIX nos bits retornados por stat.
        # As asserções HTTP de conteúdo privado/CORS acima valem nas duas plataformas.
        if os.name == 'posix':
            self.assertEqual(os.stat(self.private).st_mode&0o777,0o700)
            self.assertEqual(os.stat(self.private/'admin-inicial.json').st_mode&0o777,0o600)
            self.assertEqual(os.stat(self.private/'jogo.sqlite3').st_mode&0o777,0o600)

if __name__ == '__main__': unittest.main(verbosity=2)
