import { CompanySettings } from '../models/CompanySettings.js';
import pool from '../utils/db.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await CompanySettings.get();
    if (!settings) {
      // If no settings exist, create default
      const defaultSettings = await pool.query(
        `INSERT INTO company_settings (name, cash) VALUES ('My Company', 0) RETURNING *`
      );
      return res.json(defaultSettings.rows[0]);
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await CompanySettings.update(req.body);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

