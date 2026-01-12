import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { LogIn, Receipt } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gabim në hyrje', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Invoice Pro</h1>
          </div>
          <p className="text-sm sm:text-base text-text-secondary">Hyr në sistemin tuaj</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <Input
            label="Përdoruesi"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Shkruani emrin e përdoruesit"
            required
            autoFocus
          />
          <Input
            label="Fjalëkalimi"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shkruani fjalëkalimin"
            required
          />

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            icon={LogIn}
          >
            {loading ? 'Duke hyrë...' : 'Hyr'}
          </Button>
        </form>
      </div>
    </div>
  );
}

