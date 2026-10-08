#!/usr/bin/env python3
"""Local disposable API only. Same admin environment variables as check-phases-1-2.py."""
import concurrent.futures
import json
import os
from pathlib import Path
import runpy
import secrets
import urllib.request
import urllib.error

previous = runpy.run_path(str(Path(__file__).with_name('check-phases-1-2.py')))
request, BASE = previous['request'], previous['BASE']


def check():
    suffix = secrets.token_hex(8)
    password = secrets.token_urlsafe(20)
    admin = request('/auth/login', 'POST', {'email': os.environ['NEARKART_CHECK_ADMIN_EMAIL'], 'password': os.environ['NEARKART_CHECK_ADMIN_PASSWORD']})['accessToken']
    def register(role, tag):
        return request('/auth/register', 'POST', {'email': f'{tag}-{suffix}@example.com', 'password': password, 'displayName': tag, 'accountType': role})['accessToken']
    owner, other = register('STORE_OWNER', 'owner'), register('STORE_OWNER', 'other')
    customers = [register('CUSTOMER', f'customer{i}') for i in range(3)]
    store = request('/owner/stores', 'POST', {'name': 'Batch check ' + suffix, 'phone': '9999999999', 'timezone': 'Asia/Kolkata', 'location': {'addressLine': 'Test road', 'locality': 'Indiranagar', 'city': 'Bengaluru', 'state': 'Karnataka', 'postalCode': '560038', 'latitude': 12.9784, 'longitude': 77.6408}}, owner, expected=201)['id']
    request('/admin/stores/' + store + '/approval', 'PATCH', {'decision': 'APPROVE'}, admin)
    category = request('/admin/catalog/categories', 'POST', {'name': 'CSV category ' + suffix}, admin, expected=201)['id']
    product = request('/admin/catalog/products', 'POST', {'name': 'CSV product ' + suffix, 'categoryId': category}, admin, expected=201)['id']
    variants = [request('/admin/catalog/variants', 'POST', {'productId': product, 'label': f'Unit {i}'}, admin, expected=201)['id'] for i in range(3)]
    rows = [{'variantId': variant, 'amount': 20, 'quantity': 5, 'availability': 'AVAILABLE', 'inventoryVersion': None, 'priceVersion': None} for variant in variants[:2]]
    path = f'/owner/stores/{store}/products/import'
    preview = request(path, 'POST', {'rows': rows, 'preview': True}, owner)
    assert preview['added'] == 2
    assert request(f'/owner/stores/{store}/products', token=owner)['totalElements'] == 0
    request(path, 'POST', {'rows': rows, 'preview': False}, other, expected=404)
    request(path, 'POST', {'rows': [rows[0], rows[0]], 'preview': True}, owner, expected=400)
    request(path, 'POST', {'rows': [None], 'preview': True}, owner, expected=400)
    request(path, 'POST', {'rows': [{**rows[0], 'quantity': -1}], 'preview': True}, owner, expected=400)
    request(path, 'POST', {'rows': [rows[0], {**rows[1], 'quantity': 0}], 'preview': False}, owner, expected=400)
    assert request(f'/owner/stores/{store}/products', token=owner)['totalElements'] == 0, 'Invalid batch must not partly import'
    assert request(path, 'POST', {'rows': rows, 'preview': False}, owner)['added'] == 2
    listings = request(f'/owner/stores/{store}/products', token=owner)['content']
    listing = next(item for item in listings if item['variant']['id'] == variants[0])
    update = {**rows[0], 'amount': 22, 'inventoryVersion': listing['inventoryVersion'], 'priceVersion': listing['priceVersion']}
    assert request(path, 'POST', {'rows': [update], 'preview': True}, owner)['updated'] == 1
    request(path, 'POST', {'rows': [update], 'preview': False}, owner)
    request(path, 'POST', {'rows': [update], 'preview': False}, owner, expected=409)
    summary = request(f'/owner/stores/{store}/freshness', token=owner)
    assert summary == {'needsReview': 0, 'total': 2}
    assert request(f'/owner/stores/{store}/products?needsReview=true', token=owner)['totalElements'] == 0
    print('PASS: CSV preview, atomic import, duplicates, ownership, version conflicts and freshness summary')

    lid = listing['id']
    def create(customer, kind='RESERVATION', quantity=3):
        return request('/requests', 'POST', {'listingId': lid, 'kind': kind, 'quantity': quantity, 'message': 'Local test'}, customer)['id']
    enquiry = create(customers[0], 'ENQUIRY', 1)
    request('/owner/requests/' + enquiry, 'PATCH', {'status': 'AVAILABLE', 'response': 'Yes, in store'}, other, expected=404)
    request('/owner/requests/' + enquiry, 'PATCH', {'status': 'CONFIRMED'}, owner, expected=400)
    request('/owner/requests/' + enquiry, 'PATCH', {'status': 'AVAILABLE', 'response': 'Yes, in store'}, owner)
    inbox = request('/me/requests', token=customers[0])['content']
    assert any(item['id'] == enquiry and item['status'] == 'AVAILABLE' and item['response'] == 'Yes, in store' for item in inbox)
    request('/requests', 'POST', {'listingId': lid, 'kind': 'RESERVATION', 'quantity': 6}, customers[0], expected=409)
    first, second = create(customers[0]), create(customers[1])
    request('/requests', 'POST', {'listingId': lid, 'kind': 'RESERVATION', 'quantity': 3}, customers[0], expected=409)
    request('/owner/requests/' + first, 'PATCH', {'status': 'FULFILLED'}, owner, expected=400)
    request('/requests/' + first + '/cancel', 'PATCH', {}, customers[2], expected=404)
    def confirm(id):
        req = urllib.request.Request(BASE + '/owner/requests/' + id, data=json.dumps({'status': 'CONFIRMED'}).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + owner}, method='PATCH')
        try:
            with urllib.request.urlopen(req, timeout=20) as response: return response.status
        except urllib.error.HTTPError as failure: return failure.code
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(confirm, [first, second]))
    assert sorted(statuses) == [200, 409], f'Concurrent confirmations oversold stock: {statuses}'
    confirmed = first if statuses[0] == 200 else second
    pending = second if confirmed == first else first
    confirmed_customer = customers[0] if confirmed == first else customers[1]
    current = next(item for item in request(f'/owner/stores/{store}/products', token=owner)['content'] if item['id'] == lid)
    request('/owner/store-products/' + lid + '/inventory', 'PATCH', {'quantity': 2, 'availability': 'AVAILABLE', 'expectedVersion': current['inventoryVersion']}, owner, expected=409)
    request('/requests/' + confirmed + '/cancel', 'PATCH', {}, confirmed_customer)
    request('/owner/requests/' + pending, 'PATCH', {'status': 'CONFIRMED'}, owner)
    request('/owner/requests/' + pending, 'PATCH', {'status': 'FULFILLED'}, owner)
    request('/owner/requests/' + pending, 'PATCH', {'status': 'FULFILLED'}, owner, expected=409)
    current = next(item for item in request(f'/owner/stores/{store}/products', token=owner)['content'] if item['id'] == lid)
    assert current['quantity'] == 2, 'Collection must deduct stock once'
    request(f'/owner/stores/{store}/requests', token=other, expected=404)
    assert request('/me/requests', token=customers[2])['totalElements'] == 0
    assert request(f'/owner/stores/{store}/requests', token=owner)['totalElements'] == 3
    print('PASS: enquiry replies, privacy, reservation transitions, concurrent holds, cancellation and single stock deduction')
    print('Phases 3–4 API/database checks passed.')
    return {'storeId': store, 'listingId': lid, 'ownerEmail': f'owner-{suffix}@example.com', 'customerEmail': f'customer0-{suffix}@example.com', 'password': password, 'ownerToken': owner, 'customerToken': customers[0]}


if __name__ == '__main__':
    check()
