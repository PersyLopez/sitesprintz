import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Load staff assignments when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadAssignments();
    } else {
      setAssignments([]);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/staff/my-assignments');
      setAssignments(response.assignments || []);
      
      // Auto-select first tenant if available
      if (response.assignments && response.assignments.length > 0 && !selectedTenant) {
        setSelectedTenant(response.assignments[0].tenantId);
      }
    } catch (error) {
      console.error('Error loading staff assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTenantPermissions = () => {
    if (!selectedTenant) return null;
    
    const assignment = assignments.find(a => a.tenantId === selectedTenant);
    return assignment?.permissions || null;
  };

  const hasPermission = (permission) => {
    const permissions = getCurrentTenantPermissions();
    return permissions?.[permission] === true;
  };

  const getCurrentTenantRole = () => {
    if (!selectedTenant) return null;
    
    const assignment = assignments.find(a => a.tenantId === selectedTenant);
    return assignment?.role || null;
  };

  const value = {
    assignments,
    loading,
    selectedTenant,
    setSelectedTenant,
    loadAssignments,
    getCurrentTenantPermissions,
    hasPermission,
    getCurrentTenantRole,
    isStaff: assignments.length > 0
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const context = useContext(StaffContext);
  
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  
  return context;
}

export default StaffContext;



