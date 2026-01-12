import React, { createContext, useContext, useState, useEffect } from 'react';
import { companySettingsAPI } from '../services/api';

const CompanySettingsContext = createContext();

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within CompanySettingsProvider');
  }
  return context;
};

export const CompanySettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await companySettingsAPI.get();
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data) => {
    try {
      const response = await companySettingsAPI.update(data);
      setSettings(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  return (
    <CompanySettingsContext.Provider
      value={{
        settings,
        loading,
        loadSettings,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </CompanySettingsContext.Provider>
  );
};

