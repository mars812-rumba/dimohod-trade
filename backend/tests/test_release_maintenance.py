from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace
import json
import os

import pytest


def load_module():
    spec = spec_from_file_location('release_maintenance_tests', Path(__file__).parents[2] /
                                  'deploy/native-runtime/release_maintenance.py')
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def layout(tmp_path):
    module = load_module()
    base, runtime = tmp_path / 'production', tmp_path / 'runtime'
    (runtime / 'private').mkdir(parents=True)
    releases = []
    for day in range(1, 9):
        release = base / 'releases' / f'202611{day:02}T120000Z-abcdef123456'
        cache = release / 'apps/web/.next/cache/webpack'
        cache.mkdir(parents=True)
        (cache / 'pack').write_text('build cache')
        (release / 'apps/web/.next/BUILD_ID').write_text(str(day))
        python = release / '.venv/bin/python'
        python.parent.mkdir(parents=True)
        python.touch()
        releases.append(release)
    (base / 'current').symlink_to(releases[-1], target_is_directory=True)
    backup = runtime / 'backups/20261125T010000Z'
    backup.mkdir(parents=True)
    for name in ['COMPLETE', 'database.dump', 'storage.tar.gz', 'source.tar.gz', 'manifest.json']:
        (backup / name).write_text('backup')
    return module, base, runtime, releases, backup


def test_cache_cleanup_preserves_active_and_rollback_build_and_external_paths(layout, tmp_path):
    module, base, runtime, releases, _ = layout
    external = tmp_path / 'external'
    external.mkdir()
    (external / 'keep').write_text('keep')
    first = releases[0] / 'apps/web/.next/cache/webpack'
    module.shutil.rmtree(first)
    first.symlink_to(external, target_is_directory=True)
    removed = module.remove_webpack_caches(base, {releases[-1], releases[-2]})
    assert len(removed) == 5
    assert (external / 'keep').read_text() == 'keep'
    for release in releases:
        assert (release / 'apps/web/.next/BUILD_ID').exists()
    assert (releases[-1] / 'apps/web/.next/cache/webpack/pack').exists()
    assert (releases[-2] / 'apps/web/.next/cache/webpack/pack').exists()


def test_retention_pins_old_active_rollback_and_process_targets_and_leaves_runtime(layout):
    module, base, runtime, releases, backup = layout
    (base / 'current').unlink()
    (base / 'current').symlink_to(releases[0], target_is_directory=True)
    protected = {releases[0], releases[1]}
    before = (backup / 'storage.tar.gz').read_bytes()
    assert module.prune_releases(base, runtime, protected) == [releases[2].name]
    assert all(p.exists() for p in releases if p != releases[2])
    assert (backup / 'storage.tar.gz').read_bytes() == before


def test_pruning_is_dry_run_and_refuses_missing_or_stale_backup(layout):
    module, base, runtime, releases, backup = layout
    assert len(module.prune_releases(base, runtime, {releases[-1]}, dry_run=True)) == 3
    assert all(p.is_dir() for p in releases)
    os.utime(backup / 'COMPLETE', (0, 0))
    with pytest.raises(RuntimeError, match='backup'):
        module.prune_releases(base, runtime, {releases[-1]})
    (backup / 'COMPLETE').unlink()
    with pytest.raises(RuntimeError, match='backup'):
        module.prune_releases(base, runtime, {releases[-1]})
    assert all(p.is_dir() for p in releases)


def test_private_data_unknown_and_incomplete_release_are_never_pruned(layout):
    module, base, runtime, releases, _ = layout
    (releases[0] / 'storage/leads').mkdir(parents=True)
    (releases[1] / 'apps/web/.next/BUILD_ID').unlink()
    unknown = base / 'releases/manual-important'
    unknown.mkdir()
    assert module.prune_releases(base, runtime, {releases[-1]}) == [releases[2].name]
    assert releases[0].exists() and releases[1].exists() and unknown.exists()


def test_symlinked_release_is_never_pruned(layout, tmp_path):
    module, base, runtime, releases, _ = layout
    outside = tmp_path / 'outside'
    releases[0].rename(outside)
    releases[0].symlink_to(outside, target_is_directory=True)
    module.prune_releases(base, runtime, {releases[-1]})
    assert outside.exists() and releases[0].is_symlink()


@pytest.mark.parametrize('free,inodes,allowed', [(0, 1, False), (7, 1, False), (8, .04, False), (8, .05, True)])
def test_preflight_space_and_inode_reserve(monkeypatch, free, inodes, allowed):
    module = load_module()
    monkeypatch.setattr(module.shutil, 'disk_usage', lambda _: SimpleNamespace(free=free * module.GIB))
    monkeypatch.setattr(module.os, 'statvfs', lambda _: SimpleNamespace(f_files=100, f_favail=inodes * 100))
    if allowed:
        assert module.ensure_space(Path('/unused')) == 8
    else:
        with pytest.raises(RuntimeError, match='active release has not been switched'):
            module.ensure_space(Path('/unused'))


def test_protected_releases_include_record_and_actual_process(layout, monkeypatch):
    module, base, runtime, releases, _ = layout
    (runtime / 'private/latest-release.json').write_text(json.dumps({
        'release': str(releases[-1]), 'previous_release': str(releases[0]),
    }))
    monkeypatch.setattr(module.subprocess, 'check_output', lambda *a, **k: '123')
    original = Path.resolve
    def resolve(path, *args, **kwargs):
        return releases[1] / 'backend' if str(path) == '/proc/123/cwd' else original(path, *args, **kwargs)
    monkeypatch.setattr(Path, 'resolve', resolve)
    assert module.protected_releases(base, runtime) == {releases[-1], releases[0], releases[1]}


def test_refuses_cleanup_with_unknown_active_process(layout, monkeypatch):
    module, base, runtime, _, _ = layout
    monkeypatch.setattr(module.subprocess, 'check_output', lambda *a, **k: '0')
    with pytest.raises(RuntimeError, match='process'):
        module.maintain(base, runtime, prune=True)
