import express from 'express';
import * as companySettingsController from '../controllers/companySettingsController.js';

const router = express.Router();

// Get company settings (single object)
router.get('/', companySettingsController.getSettings);

// Update company settings (no ID needed)
router.put('/', companySettingsController.updateSettings);

export default router;

