import { Purchase } from '../models/Purchase.js';
import { Production } from '../models/Production.js';

export const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.findAll();
    res.json(purchases);
  } catch (error) {
    next(error);
  }
};

export const getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.create(req.body);
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
};

// Random client purchase endpoints
export const getRandomPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.findRandomPurchases();
    res.json(purchases);
  } catch (error) {
    next(error);
  }
};

export const createRandomPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.createRandomPurchase(req.body);
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
};

// Production endpoints
export const getProductions = async (req, res, next) => {
  try {
    const productions = await Production.findAll();
    res.json(productions);
  } catch (error) {
    next(error);
  }
};

export const getProduction = async (req, res, next) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }
    res.json(production);
  } catch (error) {
    next(error);
  }
};

export const createProduction = async (req, res, next) => {
  try {
    const production = await Production.create(req.body);
    res.status(201).json(production);
  } catch (error) {
    next(error);
  }
};

