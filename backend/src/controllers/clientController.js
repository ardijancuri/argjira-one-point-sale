import { Client } from '../models/Client.js';

export const getClients = async (req, res, next) => {
  try {
    // Normalize filter values: convert string "null" to actual null, handle empty strings
    let type = req.query.type;
    if (type === 'null' || type === '' || type === undefined) {
      type = null;
    }
    
    let search = req.query.search;
    if (search === '' || search === undefined) {
      search = null;
    }
    
    const filters = {
      type: type,
      search: search
    };
    
    const clients = await Client.findAll(filters);
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.update(req.params.id, req.body);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    await Client.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getClientsByType = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }
    
    const clients = await Client.findByType(type);
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

