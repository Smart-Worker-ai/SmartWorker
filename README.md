# Workers Portal Monorepo

This workspace contains a modular backend and Flutter frontend scaffold for the Workers Portal and Digital Vault MVP.

## Structure

- `workers-portal-backend/` - Node.js + Express API using a controller-service-repository style layout
- `workers_portal_app/` - Flutter app using a feature-first layout

## Security Baseline

- Sensitive data is encrypted before persistence.
- JWT is attached automatically by the API client on the frontend.
- File storage is designed around Supabase Storage pre-signed upload URLs.
- `.env` files are not committed.

## Next Steps

1. Install backend dependencies and run the health route.
2. Create the Flutter project from this scaffold or copy the `lib/` structure into a new Flutter app.
3. Add Neon, Supabase, and Firebase environment variables.
