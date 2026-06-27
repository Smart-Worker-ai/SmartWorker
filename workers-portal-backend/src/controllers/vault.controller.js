// ─────────────────────────────────────────────────────────────────────────────
// Digital Vault — DISABLED for v1.
//
// This feature was never functional end-to-end:
//   • Document records were held in an in-memory Map → wiped on every restart.
//   • `env.supabaseUrl` (referenced for the upload URL) does not exist in env.js,
//     so the upload URL always fell back to a dev stub — file bytes went nowhere.
//   • The worker portal app's VaultRepository.requestUploadUrl() is itself a stub
//     that never calls these endpoints.
//
// Storing real documents here would silently lose customer data, so the routes
// are gated off until the feature is built properly:
//   1. Persist document metadata in a DB table (SQLite now / Postgres post-Neon).
//   2. Store file bytes in Cloudflare R2 via presigned PUT/GET (same bucket the
//      worker_backend already uses).
//   3. Update the Flutter VaultRepository to actually upload + list.
//
// The real worker-document path (registration uploads → worker_backend → R2) is
// unaffected; this only concerns the customer/worker-portal "digital vault".
// ─────────────────────────────────────────────────────────────────────────────

const NOT_IMPLEMENTED = {
  message: 'The document vault is not available yet.',
  code: 'VAULT_DISABLED',
};

async function requestUploadUrl(_request, response) {
  return response.status(501).json(NOT_IMPLEMENTED);
}

async function saveDocument(_request, response) {
  return response.status(501).json(NOT_IMPLEMENTED);
}

async function listDocuments(_request, response) {
  // Empty list keeps any client that polls this from erroring out.
  return response.status(200).json({ documents: [] });
}

export { requestUploadUrl, saveDocument, listDocuments };
