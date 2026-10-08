# API contract outline

Base path: `/api/v1`. JSON uses camelCase and ISO-8601 UTC timestamps. Collections default to 20 and cap at 100 items.

## Envelope

```json
{"success":true,"data":{},"message":null,"meta":{"page":0,"size":20,"totalElements":1}}
```

Errors use `success:false`, `data:null`, a safe `message`, `errors` with field/code details, and a request ID. Status codes remain authoritative.

## Public/customer

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create customer or store-owner account |
| `POST` | `/auth/login` | Issue access and refresh credentials |
| `POST` | `/auth/refresh` | Rotate the HttpOnly refresh cookie |
| `POST` | `/auth/logout` | Revoke and clear the refresh cookie |
| `GET` | `/search` | Product suggestions by `q`, page, size (implemented) |
| `GET` | `/search/nearby` | Offers by `q`, latitude, longitude, radiusKm, sort, inStockOnly, page, size (implemented) |
| `GET` | `/products/{id}` | Product and variants (implemented) |
| `GET` | `/products/{id}/nearby-stores` | Comparable nearby offers |
| `GET` | `/stores/{id}` | Approved store detail and hours (implemented) |
| `GET` | `/stores/{id}/products` | Active listings (implemented) |
| `POST` | `/stores/{id}/directions` | Record an external-directions click (implemented) |
| `GET` | `/stores/{id}/reviews` | Latest approved reviews (implemented) |
| `GET` | `/me` | Authenticated profile (implemented in Phase 2) |
| `GET` | `/me/favorites` | Product/store favorites (implemented) |
| `POST/DELETE` | `/favorites[/{id}]` | Save or remove a favorite (implemented) |
| `GET/DELETE` | `/me/search-history` | Read or clear history (implemented) |
| `POST` | `/reviews` | One moderated review per customer/store (implemented) |
| `POST` | `/reports` | Report incorrect data (implemented) |

Nearby result item:

```json
{
  "product":{"id":"uuid","name":"Amul Butter","variant":"500 g"},
  "store":{"id":"uuid","name":"Sharma General Store","rating":4.4},
  "price":{"amount":"285.00","currency":"INR"},
  "availability":"AVAILABLE",
  "inventory":{"observedAt":"2026-09-05T08:00:00Z","freshness":"FRESH"},
  "distanceMeters":350,
  "recommendation":{"score":0.86,"reason":"Nearby with fresh availability"}
}
```

## Store owner

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/owner/stores` | Submit store for approval |
| `GET` | `/owner/stores` | List owned stores |
| `GET/PATCH` | `/owner/stores/{id}` | Read/update owned store |
| `PUT` | `/owner/stores/{id}/hours` | Replace validated hours |
| `GET/POST` | `/owner/stores/{id}/products` | List/add catalog link |
| `PATCH` | `/owner/store-products/{id}/inventory` | Quantity/state/source with expected version |
| `PATCH` | `/owner/store-products/{id}/price` | Price/currency with expected version |
| `GET` | `/owner/stores/{id}/analytics` | 30-day listing and activity summary |

Store submission, listing, profile/hours editing, inventory/price bulk-save UI, and analytics are implemented. All `{id}` resources are authorized against the authenticated owner; client-supplied owner/user IDs are ignored.

## Admin

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/dashboard` | Core metrics |
| `GET` | `/admin/stores` | Approval/moderation queue (implemented) |
| `PATCH` | `/admin/stores/{id}/approval` | Approve/reject with reason (implemented) |
| `GET/PATCH` | `/admin/users[/{id}]` | Search/suspend/reactivate users (implemented) |
| `GET/PATCH` | `/admin/moderation/stores[/{id}]` | Search all stores; suspend/restore previously approved stores with expectedVersion (implemented) |
| `POST` | `/admin/users/{id}/recovery` | Issue a single-use recovery code after verified ownership (implemented) |
| `POST` | `/auth/recovery` | Redeem recovery code and set new password (implemented) |
| `GET/PATCH` | `/admin/reviews[/{id}]` | Approve/reject published or pending reviews (implemented) |
| `GET/PATCH` | `/admin/reports[/{id}]` | Resolve/dismiss reports with a reason (implemented) |
| `GET` | `/admin/audit-logs` | Searchable paginated audit trail (implemented) |
| `POST` | `/admin/catalog/categories` | Create a category |
| `POST` | `/admin/catalog/products` | Create a product |
| `POST` | `/admin/catalog/variants` | Create a product variant |

Catalog creation and owner listing/inventory/price operations are implemented. Inventory and price updates require the latest returned version; stale writes return `409`.

## Validation and status semantics

- `400` malformed input; `401` missing/invalid auth; `403` role/ownership failure; `404` hidden or absent resource; `409` duplicate/stale version; `422` valid syntax but invalid domain transition; `429` rate limit.
- Coordinates: latitude `[-90,90]`, longitude `[-180,180]`; radius `0.1–25 km`; prices positive; quantities nonnegative.
- Search query is trimmed, normalized, 2–120 characters; blank queries are rejected.

### Launch phase 2 admin operations

- Admin list endpoints accept `q` (up to 120 characters), `page` (0–1,000,000) and `size` (1–100); return `content`, `totalElements`, `page`, `size`.
- `GET /admin/catalog/{categories|products|variants}` lists catalog entries. Existing POST routes create entries; PATCH routes at `/{id}` edit them. Variants cannot move between products. `PATCH /admin/catalog/products/{id}/status` activates/deactivates products.
- Moderation bodies contain `status`, a nonblank `reason` (up to 500 characters), and, for stores, `expectedVersion`. Pending store approval continues through the existing approval endpoint. Administrator accounts cannot be suspended or recovered through the merchant/customer admin workflow.
- Recovery issuance requires `identityVerified: true` and a non-sensitive verification reference in `reason`. The response contains a one-time `token` and `expiresAt`; share privately with the verified holder. Redeem with `{token,password}` at `/auth/recovery`. Codes expire after 30 minutes and only their hash is stored.
- Password recovery and user moderation revoke refresh credentials and increment the account auth version. Access JWTs are checked against active account status/version, so old credentials remain invalid after reactivation.
- Catalog and moderation mutations write audit entries transactionally; passwords and recovery codes are never included in audit metadata.

### Launch phases 3–4 inventory onboarding and requests

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/owner/stores/{id}/products/import` | Validate or atomically import up to 500 INR inventory rows |
| `GET` | `/owner/stores/{id}/freshness` | Total listings and count needing a stock review |
| `GET` | `/owner/stores/{id}/products?needsReview=true` | Paginated listings older than the configured recent-stock window |
| `POST` | `/requests` | Customer stock enquiry or reservation request |
| `GET` | `/me/requests?page=0` | Customer's own request history, 20 per page |
| `GET` | `/owner/stores/{id}/requests?page=0` | Owned store's customer inbox, 20 per page |
| `PATCH` | `/owner/requests/{id}` | Merchant reply, confirmation, decline or collection |
| `PATCH` | `/requests/{id}/cancel` | Customer cancels their own open request |

- Import body: `{ "preview": true, "rows": [{ "variantId": "UUID", "amount": 25.50, "quantity": 5, "availability": "AVAILABLE", "inventoryVersion": null, "priceVersion": null }] }`. Send `preview: false` to commit; both preview and commit revalidate. Existing rows require current inventory and price versions. Duplicate variants, invalid stock/price, inactive products and stale versions are rejected. The whole commit rolls back if any row fails, including a reservation-stock conflict.
- The dashboard downloads a CSV template and exports existing inventory (up to 10,000 listings). Headers: `variantId,amount,quantity,availability,inventoryVersion,priceVersion`. CSV files are limited to 1 MB and 500 rows; imports/exports support INR. Catalog search exposes variant IDs for new listings; existing rows should come from a fresh export. Imports and selected-item saves reconfirm inventory timestamps.
- Freshness reminders appear in the dashboard and refresh while open; the review threshold reuses `nearkart.inventory.recent-for` (default two hours). They do not send external notifications.
- Create request body: `{ "listingId": "UUID", "kind": "ENQUIRY", "quantity": 1, "message": "Optional, up to 500 characters" }`; kind may also be `RESERVATION`, quantity is 1–100. Customer role is required. Each customer may have at most 20 open requests and one open request of each kind per listing. Only approved stores with active owners/products/listings accept new requests.
- Merchant PATCH body: `{ "status": "AVAILABLE", "response": "Optional, up to 500 characters" }`. Enquiries transition from `PENDING` to `AVAILABLE` or `UNAVAILABLE`. Reservations transition from `PENDING` to `CONFIRMED` or `DECLINED`; `CONFIRMED` to `FULFILLED`, `DECLINED` or customer `CANCELLED`. Invalid transitions return `400`; ended/expired requests and insufficient stock return `409`.
- Pending requests expire after 24 hours. Confirmation snapshots the unit price/currency and holds the requested quantity for two hours. Expiry is evaluated using server time on reads and actions; expired holds stop counting immediately without a scheduled worker. Inbox polling runs every 30 seconds while open. No email, SMS, push delivery, payment or checkout is involved.
- Known stock quantities are required for reservations. Confirmations and inventory edits lock the same inventory row; confirmed holds cannot oversell stock, and edits/imports must cover live holds. Collection deducts the quantity once and increments the inventory version; cancellation, decline and expiry release the hold without deducting stock. Request changes create audit events. Contact and pickup remain at the physical store.
