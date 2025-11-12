import { useContext } from 'react';
import { SiteContext } from '../context/SiteContext';

export function useSite() {
  const context = useContext(SiteContext);
  
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  
  return context;
}

export default useSite;

