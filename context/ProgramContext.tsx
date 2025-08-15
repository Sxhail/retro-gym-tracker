import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProgramContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export const useProgramRefresh = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgramRefresh must be used within a ProgramProvider');
  }
  return context;
};

export const ProgramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    console.log('🔄 Program refresh triggered globally');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const value: ProgramContextType = {
    refreshTrigger,
    triggerRefresh,
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};
