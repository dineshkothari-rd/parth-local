#!/usr/bin/env python3
"""Run against a LOCAL disposable database/API; creates test accounts and catalog data.
Set NEARKART_CHECK_URL, NEARKART_CHECK_ADMIN_EMAIL and NEARKART_CHECK_ADMIN_PASSWORD.
Uses only Python's standard library. Never run against production.
"""
import copy
import http.cookiejar
import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get('NEARKART_CHECK_URL', 'http://localhost:18080/api/v1')
assert urllib.parse.urlparse(BASE).hostname in ('localhost', '127.0.0.1'), 'Local checks only'


def request(path, method='GET', data=None, token=None, expected=200, client=None):
    headers = {'Content-Type': 'application/json', 'Origin': 'http://localhost:5173'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
    try:
        response = (client or urllib.request.build_opener()).open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status, body = response.status, json.loads(response.read())
    assert status == expected, f'{method} {path}: expected {expected}, got {status}: {body.get("message")}'
    return body.get('data')


def check():
    suffix = secrets.token_hex(5)
    password = secrets.token_urlsafe(20)
    admin = request('/auth/login', 'POST', {'email': os.environ['NEARKART_CHECK_ADMIN_EMAIL'], 'password': os.environ['NEARKART_CHECK_ADMIN_PASSWORD']})
    admin_token = admin['accessToken']
    customer_client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def register(kind, client=None):
        return request('/auth/register', 'POST', {'email': f'{kind.lower()}-{suffix}@example.com', 'password': password, 'displayName': 'Phase check ' + kind, 'accountType': kind}, client=client)
    customer = register('CUSTOMER', customer_client)
    owner = register('STORE_OWNER')
    other_owner = request('/auth/register', 'POST', {'email': f'other-owner-{suffix}@example.com', 'password': password, 'displayName': 'Other owner', 'accountType': 'STORE_OWNER'})
    ct, ot, uid = customer['accessToken'], owner['accessToken'], customer['user']['id']
    request('/admin/users', token=ct, expected=403)
    request('/admin/users', expected=401)
    for path in ['users', 'moderation/stores', 'reviews', 'reports', 'audit-logs', 'catalog/categories', 'catalog/products', 'catalog/variants']:
        result = request('/admin/' + path, token=admin_token)
        assert isinstance(result['content'], list) and result['totalElements'] >= 0
    request('/admin/users?size=101', token=admin_token, expected=400)
    request('/admin/users/' + uid, 'PATCH', {'status': 'ADMIN', 'reason': 'Invalid elevation'}, admin_token, expected=400)
    request('/admin/users/' + uid, 'PATCH', {'status': 'SUSPENDED', 'reason': ''}, admin_token, expected=400)
    request('/admin/users/' + admin['user']['id'], 'PATCH', {'status': 'SUSPENDED', 'reason': 'Prevent lockout'}, admin_token, expected=400)
    print('PASS: admin access, pagination bounds, invalid statuses and administrator protection')

    store = request('/owner/stores', 'POST', {'name': 'Phase store ' + suffix, 'phone': '9999999999', 'timezone': 'Asia/Kolkata', 'location': {'addressLine': 'Test road', 'locality': 'Indiranagar', 'city': 'Bengaluru', 'state': 'Karnataka', 'postalCode': '560038', 'latitude': 12.9784, 'longitude': 77.6408}}, ot, expected=201)
    sid = store['id']
    request('/stores/' + sid, expected=404)
    request('/admin/stores/' + sid + '/approval', 'PATCH', {'decision': 'APPROVE'}, admin_token)
    request('/owner/stores/' + sid, 'PATCH', {'description': 'Updated by owner'}, ot)
    request('/owner/stores/' + sid + '/hours', 'PUT', {'hours': [{'weekday': 1, 'closed': False, 'opensAt': '09:00', 'closesAt': '21:00'}]}, ot)
    request('/owner/stores/' + sid, token=ct, expected=403)
    request('/owner/stores/' + sid, token=other_owner['accessToken'], expected=404)
    request('/owner/stores/' + sid, 'PATCH', {'description': 'Unauthorized edit'}, other_owner['accessToken'], expected=404)
    assert request('/stores/' + sid)['description'] == 'Updated by owner'
    assert len(request('/stores/' + sid)['hours']) == 1
    print('PASS: store submission, approval, ownership, profile and hours')

    name = secrets.token_hex(20)  # Keep fuzzy search isolated from previous test runs.
    category = request('/admin/catalog/categories', 'POST', {'name': 'Phase category ' + suffix}, admin_token, expected=201)
    cid = category['id']
    request('/admin/catalog/categories/' + cid, 'PATCH', {'name': 'Edited category ' + suffix}, admin_token)
    product = request('/admin/catalog/products', 'POST', {'name': name, 'categoryId': cid, 'brand': 'Test'}, admin_token, expected=201)
    pid = product['id']
    request('/admin/catalog/products/' + pid, 'PATCH', {'name': name, 'categoryId': cid, 'brand': 'Edited'}, admin_token)
    listings = []
    for index in range(21):
        variant = request('/admin/catalog/variants', 'POST', {'productId': pid, 'label': f'Variant {index}'}, admin_token, expected=201)
        if index == 0:
            request('/admin/catalog/variants/' + variant['id'], 'PATCH', {'productId': pid, 'label': 'Edited variant'}, admin_token)
        listings.append(request('/owner/stores/' + sid + '/products', 'POST', {'variantId': variant['id'], 'amount': 2 if index == 20 else 100 + index, 'quantity': 10, 'availability': 'AVAILABLE'}, ot, expected=201))
    detail = request('/products/' + pid)
    assert detail['brand'] == 'Edited' and len(detail['variants']) == 21
    query = '/search/nearby?' + urllib.parse.urlencode({'q': name, 'latitude': 12.9784, 'longitude': 77.6408, 'sort': 'PRICE'})
    result = request(query)
    assert result['totalElements'] == 21 and len(result['content']) == 20
    assert float(result['content'][0]['amount']) == 2, 'Sort must run before pagination'
    assert len(request(query + '&page=1')['content']) == 1
    listing = listings[0]
    stock = request('/owner/store-products/' + listing['id'] + '/inventory', 'PATCH', {'quantity': 0, 'availability': 'OUT_OF_STOCK', 'expectedVersion': listing['inventoryVersion']}, ot)
    request('/owner/store-products/' + listing['id'] + '/inventory', 'PATCH', {'quantity': 1, 'availability': 'AVAILABLE', 'expectedVersion': listing['inventoryVersion']}, ot, expected=409)
    assert request(query + '&inStockOnly=true')['totalElements'] == 20
    price = request('/owner/store-products/' + listing['id'] + '/price', 'PATCH', {'amount': 5, 'expectedVersion': stock['priceVersion']}, ot)
    request('/owner/store-products/' + listing['id'] + '/price', 'PATCH', {'amount': 6, 'expectedVersion': stock['priceVersion']}, ot, expected=409)
    assert float(price['amount']) == 5
    print('PASS: catalog creation/editing, listings, price/stock concurrency, search sorting/filtering/pagination')

    favorite = request('/favorites', 'POST', {'type': 'PRODUCT', 'targetId': pid}, ct)
    assert any(item['id'] == favorite['id'] for item in request('/me/favorites', token=ct))
    request('/favorites/' + favorite['id'], 'DELETE', token=ct)
    request(query, token=ct)
    assert any(item['query'].lower() == name.lower() for item in request('/me/search-history', token=ct))
    request('/me/search-history', 'DELETE', token=ct)
    review = request('/reviews', 'POST', {'storeId': sid, 'rating': 5, 'text': 'Verified useful store'}, ct)
    assert not request('/stores/' + sid + '/reviews')
    request('/admin/reviews/' + review['id'], 'PATCH', {'status': 'APPROVED', 'reason': 'Reviewed feedback'}, admin_token)
    assert request('/stores/' + sid + '/reviews')[0]['id'] == review['id']
    request('/admin/reviews/' + review['id'], 'PATCH', {'status': 'REJECTED', 'reason': 'Removed on review'}, admin_token)
    assert not request('/stores/' + sid + '/reviews')
    report = request('/reports', 'POST', {'storeId': sid, 'type': 'WRONG_PRICE', 'details': 'Check price'}, ct)
    request('/admin/reports/' + report['id'], 'PATCH', {'status': 'RESOLVED', 'reason': 'Merchant corrected price'}, admin_token)
    print('PASS: favorites/history, review visibility and report resolution')

    rows = request('/admin/moderation/stores?q=' + urllib.parse.quote('Phase store ' + suffix), token=admin_token)['content']
    version = rows[0]['version']
    request('/admin/moderation/stores/' + sid, 'PATCH', {'status': 'SUSPENDED', 'reason': 'Moderation check', 'expectedVersion': version}, admin_token)
    request('/stores/' + sid, expected=404)
    assert request(query)['totalElements'] == 0
    request('/admin/moderation/stores/' + sid, 'PATCH', {'status': 'APPROVED', 'reason': 'Outdated version', 'expectedVersion': version}, admin_token, expected=409)
    request('/admin/moderation/stores/' + sid, 'PATCH', {'status': 'APPROVED', 'reason': 'Review complete', 'expectedVersion': version + 1}, admin_token)
    request('/admin/catalog/products/' + pid + '/status', 'PATCH', {'status': 'INACTIVE', 'reason': 'Catalog correction'}, admin_token)
    request('/products/' + pid, expected=404)
    assert request(query)['totalElements'] == 0
    request('/admin/catalog/products/' + pid + '/status', 'PATCH', {'status': 'ACTIVE', 'reason': 'Correction complete'}, admin_token)
    assert request('/admin/audit-logs?q=MODERATED', token=admin_token)['totalElements'] > 0
    print('PASS: store/product moderation removes public visibility and creates audit events')

    request('/admin/users/' + uid + '/recovery', 'POST', {'identityVerified': False, 'reason': 'Not verified'}, admin_token, expected=400)
    recovery = request('/admin/users/' + uid + '/recovery', 'POST', {'identityVerified': True, 'reason': 'Test verification'}, admin_token)
    new_password = secrets.token_urlsafe(20)
    request('/auth/recovery', 'POST', {'token': recovery['token'], 'password': new_password})
    request('/auth/recovery', 'POST', {'token': recovery['token'], 'password': new_password}, expected=400)
    request('/me', token=ct, expected=401)
    request('/auth/refresh', 'POST', {}, expected=401, client=customer_client)
    request('/auth/login', 'POST', {'email': customer['user']['email'], 'password': password}, expected=401)
    session = request('/auth/login', 'POST', {'email': customer['user']['email'], 'password': new_password}, client=customer_client)
    ct = session['accessToken']
    request('/me', token=ct)
    request('/admin/users/' + uid, 'PATCH', {'status': 'SUSPENDED', 'reason': 'Abuse review'}, admin_token)
    request('/me', token=ct, expected=401)
    request('/auth/refresh', 'POST', {}, expected=401, client=customer_client)
    request('/admin/users/' + uid, 'PATCH', {'status': 'ACTIVE', 'reason': 'Review complete'}, admin_token)
    request('/me', token=ct, expected=401)
    request('/auth/login', 'POST', {'email': customer['user']['email'], 'password': new_password}, client=customer_client)
    old_cookies = http.cookiejar.CookieJar()
    cookie_processor = next(handler for handler in customer_client.handlers if isinstance(handler, urllib.request.HTTPCookieProcessor))
    for cookie in cookie_processor.cookiejar:
        old_cookies.set_cookie(copy.copy(cookie))
    request('/auth/refresh', 'POST', {}, client=customer_client)
    old_client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(old_cookies))
    request('/auth/logout', 'POST', {}, client=old_client)
    request('/auth/refresh', 'POST', {}, expected=401, client=customer_client)
    print('PASS: one-time recovery, old password/session rejection, suspension/reactivation and logout')
    print('Phases 1–2 API/database checks passed.')


if __name__ == '__main__':
    check()
