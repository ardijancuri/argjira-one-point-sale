import React from 'react';
import { useCompanySettings } from '../../contexts/CompanySettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { User, Menu } from 'lucide-react';

export default function TopBar({ title }) {
  const { settings } = useCompanySettings();
  const { user } = useAuth();
  const { open } = useSidebar();

  return (
    <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg mb-4 sm:mb-6 shadow-sm flex justify-between items-center gap-4 w-full max-w-full">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={open}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Open menu"
          title="Open sidebar"
        >
          <Menu className="w-4 h-4 text-text-secondary" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 min-w-0">
        {settings && (
          <span className="font-semibold text-sm sm:text-base hidden sm:inline">{settings.name}</span>
        )}
        {user && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
            <span className="text-sm sm:text-base">{user.role === 'admin' ? 'Admin' : 'Manager'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

