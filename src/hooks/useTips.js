import { useContext } from 'react';
import { TipsContext } from '../context/TipsContext';

export function useTips() {
  const context = useContext(TipsContext);
  
  if (!context) {
    throw new Error('useTips must be used within a TipsProvider');
  }
  
  return context;
}

export default useTips;



