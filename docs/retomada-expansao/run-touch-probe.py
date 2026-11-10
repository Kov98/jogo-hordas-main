import os,threading,tempfile,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
from server import create_server
with tempfile.TemporaryDirectory() as d:
 s=create_server(root=Path.cwd(),private_dir=Path(d),port=0);threading.Thread(target=s.serve_forever,daemon=True).start()
 e=os.environ.copy();e['MURALHA_TEST_URL']=f'http://127.0.0.1:{s.server_port}';e['PLAYWRIGHT_MODULE']='/home/escola/.cache/ms-playwright-go/1.57.0/package'
 subprocess.run(['node','/tmp/touch-probe.cjs'],env=e);s.shutdown()
