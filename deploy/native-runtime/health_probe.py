"""Read-only diagnostics plus a temporary fsync as the API user, executed over SSH."""
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.request import urlopen

RUNTIME = Path('/home/dimohod-production-runtime')


def collect():
    result = {'checks': {}, 'disk': {}}
    usage = shutil.disk_usage(RUNTIME / 'storage')
    stats = os.statvfs(RUNTIME / 'storage')
    result['disk'] = {'free_bytes': usage.free, 'total_bytes': usage.total,
                      'free_inodes_fraction': stats.f_favail / stats.f_files if stats.f_files else 1}
    for service in ('dimohod-api', 'dimohod-web', 'dimohod-postgres'):
        try:
            state = subprocess.check_output(
                ['systemctl', 'is-active', service], timeout=5, text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            result['checks'][service] = state == 'active'
        except (OSError, subprocess.SubprocessError):
            result['checks'][service] = False
    try:
        with urlopen('http://127.0.0.1:8102/api/v1/products?limit=1', timeout=10) as response:
            result['checks']['database_catalog'] = (
                response.status == 200 and isinstance(json.loads(response.read())['items'], list)
            )
    except (OSError, ValueError, KeyError):
        result['checks']['database_catalog'] = False
    # Use the API process uid, not root, and fsync to detect full disks and permissions.
    script = '''import os,tempfile
from pathlib import Path
root=Path('/home/dimohod-production-runtime/storage')
with tempfile.TemporaryDirectory(prefix='.dimohod-health-',dir=root) as folder:
    with (Path(folder)/'probe').open('wb') as stream:
        stream.write(b'dimohod-health');stream.flush();os.fsync(stream.fileno())
'''
    try:
        subprocess.run(['runuser', '-u', 'dimohod', '--', 'python3', '-c', script],
                       check=True, timeout=10, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        result['checks']['storage_write'] = True
    except (OSError, subprocess.SubprocessError):
        result['checks']['storage_write'] = False
    return result


if __name__ == '__main__':
    print(json.dumps(collect()))
