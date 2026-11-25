"""Bounded maintenance of native release artifacts; never runtime data/backups."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

GIB = 1024 ** 3
RELEASE_NAME = re.compile(r"\d{8}T\d{6}Z-[0-9a-f]{12}")


def release_directories(base):
    root = base / 'releases'
    if root.is_symlink():
        raise RuntimeError('Refusing a symlinked releases directory')
    return sorted(p for p in root.iterdir()
                  if RELEASE_NAME.fullmatch(p.name) and p.is_dir() and not p.is_symlink())


def protected_releases(base, runtime):
    """Pin symlink, last rollback target and the actual API/web process cwd."""
    current = base / 'current'
    if not current.is_symlink() or not current.resolve().is_dir():
        raise RuntimeError('Cannot identify the active release; refusing cleanup')
    protected = {current.resolve()}
    record = runtime / 'private/latest-release.json'
    if record.exists():
        data = json.loads(record.read_text())
        for key in ('release', 'previous_release'):
            if data.get(key):
                protected.add(Path(data[key]).resolve())
    for service in ('dimohod-api.service', 'dimohod-web.service'):
        pid = subprocess.check_output(
            ['systemctl', 'show', service, '--value', '-pMainPID'], text=True, timeout=5,
        ).strip()
        if not pid.isdigit() or int(pid) < 1:
            raise RuntimeError(f'Cannot identify {service} process; refusing cleanup')
        cwd = Path(f'/proc/{pid}/cwd').resolve(strict=True)
        for release in release_directories(base):
            if cwd.is_relative_to(release):
                protected.add(release.resolve())
    return protected


def remove_webpack_caches(base, protected):
    removed = []
    for release in release_directories(base):
        if release.resolve() in protected:
            continue
        target = release / 'apps/web/.next/cache/webpack'
        # Reject symlinks in every ancestor, including an entire external .next.
        if any(p.is_symlink() for p in (target, *target.parents) if p != base.parent):
            continue
        if target.is_dir() and target.resolve().is_relative_to(release.resolve()):
            shutil.rmtree(target)
            removed.append(release.name)
    return removed


def ensure_space(path, minimum_gib=8):
    free = shutil.disk_usage(path).free
    stats = os.statvfs(path)
    inode_fraction = stats.f_favail / stats.f_files if stats.f_files else 1
    if free < minimum_gib * GIB or inode_fraction < .05:
        raise RuntimeError(
            f'Not enough disk space for deployment: {free / GIB:.2f} GiB free; '
            f'at least {minimum_gib} GiB and 5% free inodes required. '
            'The active release has not been switched.'
        )
    return round(free / GIB, 2)


def recent_complete_backup(runtime):
    backups = runtime / 'backups'
    if not backups.is_dir() or backups.is_symlink():
        return False
    for folder in backups.iterdir():
        if folder.is_symlink() or not folder.is_dir():
            continue
        marker = folder / 'COMPLETE'
        required = ('database.dump', 'storage.tar.gz', 'source.tar.gz', 'manifest.json')
        if (marker.is_file() and time.time() - marker.stat().st_mtime < 48 * 3600
                and all((folder / name).is_file() and (folder / name).stat().st_size > 0
                        for name in required)):
            return True
    return False


def prune_releases(base, runtime, protected, keep=5, dry_run=False):
    if keep < 3:
        raise ValueError('Keep at least three releases')
    if not recent_complete_backup(runtime):
        raise RuntimeError('A completed backup less than 48 hours old is required for release pruning')
    current = (base / 'current').resolve(strict=True)
    if current not in protected:
        raise RuntimeError('The active release must be protected')
    releases = release_directories(base)
    retained = set(releases[-keep:]) | protected | {current}
    removed = []
    for release in releases:
        if release in retained:
            continue
        # Old/faulty directories and any private data require manual inspection.
        if not ((release / 'apps/web/.next/BUILD_ID').is_file()
                and (release / '.venv/bin/python').exists()):
            continue
        if any((release / 'storage' / name).exists()
               for name in ('leads', 'customers', 'ready-kits')):
            continue
        if (base / 'current').resolve(strict=True) != current:
            raise RuntimeError('Active release changed; stopping cleanup')
        if not dry_run:
            shutil.rmtree(release)
        removed.append(release.name)
    return removed


def maintain(base, runtime, *, prune=False, dry_run=False):
    protected = protected_releases(base, runtime)
    caches = [] if dry_run else remove_webpack_caches(base, protected)
    releases = prune_releases(base, runtime, protected, dry_run=dry_run) if prune else []
    result = {'dry_run': dry_run, 'webpack_caches': caches, 'old_releases': releases,
              'free_gib': round(shutil.disk_usage(base).free / GIB, 2)}
    print('Native release maintenance: ' + json.dumps(result), flush=True)
    return result
