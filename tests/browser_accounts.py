"""Integração no navegador com banco descartável; requer Node e Playwright."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server import create_server

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--inferno', action='store_true', help='Conferir fortaleza do Inferno, demônios, tornado e feixe de luz.')
parser.add_argument('--catacombs', action='store_true', help='Conferir a terceira fase, evoluções, relíquias, altares, segredo e coleção.')
parser.add_argument('--selector', action='store_true', help='Conferir seleção e progresso separado por perfil nas três fases.')
parser.add_argument('--collection', action='store_true', help='Conferir coleção, aparência e poder inicial alternativo no jogo real.')
parser.add_argument('--new-content', action='store_true', help='Conferir poderes, herói, criaturas, partículas e cinema da floresta.')
parser.add_argument('--forest-cinema', action='store_true', help='Conferir cutscene, bloqueio de controles e cancelamento na floresta.')
parser.add_argument('--journey-regressions', action='store_true', help='Conferir respostas de perfil atrasadas e cutscene.')
parser.add_argument('--journey', action='store_true', help='Conferir fases, portas, checkpoint, perfil e desfecho.')
parser.add_argument('--forest', action='store_true', help='Conferir campanha Floresta→Castelo, cenário, encontros e transferência.')
parser.add_argument('--expansion', action='store_true', help='Conferir poderes, evoluções, dash, encontros e dificuldades.')
parser.add_argument('--controls', action='store_true', help='Conferir teclado e pausa após janelas de conta/ranking.')
args = parser.parse_args()
script = 'browser_inferno.cjs' if args.inferno else 'browser_catacombs.cjs' if args.catacombs else 'selector_checks.cjs' if args.selector else 'browser_collection.cjs' if args.collection else 'browser_new_content.cjs' if args.new_content else 'forest_cinema_checks.cjs' if args.forest_cinema else 'journey_regressions.cjs' if args.journey_regressions else 'browser_journey.cjs' if args.journey else 'browser_forest.cjs' if args.forest else 'browser_expansion.cjs' if args.expansion else 'browser_portal_controls.cjs' if args.controls else 'browser_accounts.cjs'

with tempfile.TemporaryDirectory(prefix='muralha-browser-') as folder:
    private = Path(folder) / 'dados'
    httpd = create_server(root=ROOT, private_dir=private, port=0)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    env = os.environ.copy()
    env['MURALHA_TEST_URL'] = f'http://127.0.0.1:{httpd.server_port}'
    env['MURALHA_TEST_CREDENTIALS'] = str(private / 'admin-inicial.json')
    env['MURALHA_TEST_DATA_DIR'] = str(private)
    env['MURALHA_PYTHON'] = sys.executable
    try:
        result = subprocess.run(['node', str(ROOT / 'tests' / script)], env=env, cwd=ROOT)
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()
    raise SystemExit(result.returncode)
