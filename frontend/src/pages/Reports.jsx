import React from 'react';
import TopBar from '../components/Layout/TopBar';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <>
      <TopBar title="Raportet" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div className="bg-white rounded-lg p-6 sm:p-12 text-center">
          <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 opacity-30 text-text-secondary" />
          <h2 className="text-xl sm:text-2xl mb-2 sm:mb-3">Raportet</h2>
          <p className="text-text-secondary text-sm sm:text-base">Coming Soon - Së shpejti</p>
        </div>
      </div>
    </>
  );
}

