import json
from pathlib import Path
import socket
import time
from urllib.parse import urlsplit
import httpx
from dotenv import dotenv_values

R = Path('/home/dimohod-production-runtime')
original = socket.getaddrinfo
def local_domain(host, *args, **kwargs):
    return original('127.0.0.1' if host in ['dimohod-trade.pro', b'dimohod-trade.pro', 'www.dimohod-trade.pro', b'www.dimohod-trade.pro'] else host, *args, **kwargs)
socket.getaddrinfo = local_domain
results = []
with httpx.Client(base_url='https://dimohod-trade.pro', timeout=60, trust_env=False) as c:
    def check(path, expected=200, follow_redirects=False):
        r = c.get(path, follow_redirects=follow_redirects)
        assert r.status_code == expected, (path, r.status_code)
        results.append({'path': path, 'status': r.status_code})
        return r
    home = check('/')
    assert 'Цены предварительные' in home.text
    check('/api/v1/health')
    tree = check('/api/v1/catalog/tree').json()
    data = check('/api/v1/products?limit=1').json()
    product = data['items'][0]
    check('/catalog')
    check('/configurator')
    card = check('/product/'+product['slug'], follow_redirects=True)
    assert card.url.host == 'dimohod-trade.pro'
    check('/product/definitely-missing-recovery-check', 404)
    redirect = check('/admin/catalog', 307)
    target = urlsplit(redirect.headers['location'])
    assert target.scheme == 'https' and target.netloc == 'dimohod-trade.pro', target
    check('/admin/login')
    check('/api/v1/admin/customers', 401)
    check('/media/customers/does-not-exist.json', 404)
    check('/media/leads/does-not-exist.json', 404)
    media = product.get('primary_image')
    if media:
        check(media['url'])
    password = dotenv_values(R/'private/production.env')['BOM_ADMIN_TOKEN']
    login = c.post('/api/v1/admin/auth/login', json={'password': password})
    assert login.status_code == 200
    cookie = login.headers['set-cookie'].lower()
    assert 'secure' in cookie and 'httponly' in cookie and 'samesite=lax' in cookie
    check('/api/v1/admin/auth/session')
    check('/admin/catalog')
    check('/admin/customers')
    check('/api/v1/admin/customers')
    assert c.post('/api/v1/admin/auth/logout').status_code == 200
    check('/api/v1/admin/customers', 401)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    (R/'https-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
