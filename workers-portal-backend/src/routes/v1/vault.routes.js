import { Router } from 'express';
import { requestUploadUrl, saveDocument, listDocuments } from '../../controllers/vault.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const vaultRouter = Router();

vaultRouter.use(requireAuth);
vaultRouter.post('/upload-url', requestUploadUrl);
vaultRouter.post('/document', saveDocument);
vaultRouter.get('/documents', listDocuments);

export { vaultRouter };
