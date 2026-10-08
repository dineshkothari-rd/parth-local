# Deploy and test NearKart

## Current Vercel testing preview — 8 October 2026

Canonical frontend preview: https://parth-local.vercel.app. Vercel root frontend, Vite dist, Node 22. API requests remain same-origin /api and proxy to the existing Render Java backend. Two backend health checks timed out; deployed frontend does not prove functional login/search/store flows. Backend recovery remains necessary. No backend or customer data was deleted.

Free Hobby hosting is for personal, non-commercial testing; use an eligible plan before business launch. No paid resources were purchased. See the parent studio docs/DEPLOYMENT.md for the full portfolio status.


NearKart deploys as a Vercel frontend, a Render Docker web service, and Render PostgreSQL. The frontend proxies `/api/*` to Render, so authentication cookies remain first-party in the browser.

## 1. Deploy the frontend on Vercel

1. In Vercel, select **Add New → Project** and import the NearKart GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Vite build settings and deploy. No frontend environment variable is required.
4. Copy the production URL, for example `https://nearkart.vercel.app`.

The first deployment can complete before the API exists; API requests will start working after Render is ready.

## 2. Deploy the API and database on Render

1. Generate a production JWT secret locally:

   ```sh
   openssl rand -base64 48
   ```

2. In Render, select **New → Blueprint**, connect the same repository, and use the root `render.yaml`.
3. Enter the requested values:
   - `JWT_SECRET`: the generated value
   - `ADMIN_EMAIL`: the initial administrator email
   - `ADMIN_PASSWORD`: a unique password of 12–72 characters
   - `CORS_ALLOWED_ORIGIN`: the exact Vercel URL from step 1, without a trailing slash
4. Apply the Blueprint and wait until `https://nearkart-api.onrender.com/actuator/health` returns `{"status":"UP"}`.

If Render changes the service name because `nearkart-api` is unavailable, replace the hostname in `frontend/vercel.json`, commit it, and redeploy Vercel.

The admin account is created on the first successful API start. Later deployments do not reset an existing admin password.

## 3. Production smoke test

Use both a narrow mobile viewport and a desktop browser.

1. Open the Vercel URL and hard-refresh `/login` to verify SPA routing.
2. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`; `/account` should show **Review stores**.
3. Register another account as a store owner, sign in, create a store, and add its location and hours.
4. Sign back in as admin and approve the pending store under `/admin/stores`.
5. Search for `Amul` or `Tata Salt`, allow browser location (or enter coordinates manually), and verify that the page remains usable at mobile and desktop widths.
6. In browser developer tools, confirm `/api/v1/...` requests return from the Vercel domain without CORS or mixed-content errors.

The current UI covers authentication, search, product/store details, favorites, history, reviews, reports, and the owner dashboard for store details, hours, listings, price/inventory updates, and analytics. Admin catalog creation remains available through the documented API.

## Troubleshooting

- **API returns 502/404:** verify the Render service URL matches `frontend/vercel.json` and redeploy Vercel after changing it.
- **CORS error:** set `CORS_ALLOWED_ORIGIN` on Render to the exact `https://...vercel.app` production URL and redeploy the service.
- **Login works but refresh/logout fails:** confirm `AUTH_SECURE_COOKIE=true`; access the app through HTTPS, not the Render API URL directly.
- **First request is slow:** inspect the Render service logs and wait for the health check to become `UP` before testing.
- **Database startup fails:** confirm the Blueprint created `nearkart-db` and all five database variables are linked from it.

Do not put JWT, admin, or database secrets in Vercel variables, Git, screenshots, or support messages.
