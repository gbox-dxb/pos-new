import React from 'react';
import { motion } from 'framer-motion';
import {Plus, Download, RefreshCw, ShoppingCart, DollarSign, Upload, Lock} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { Card } from '@/components/ui/card';
import { useAccessControl } from '@/contexts/AccessControlContext';

const DashboardHeader = ({
  onAddStore,
  onSync,
  onExport,
  onImport,
  loading,
  storesCount,
  ordersCount,
  revenueString
}) => {
  const { theme } = useTheme();
  const { permissions } = useAccessControl();
  
  // helper method to get username
  const getUsername = () => {
    try {
      const session = JSON.parse(sessionStorage.getItem("auth"));
      if (session?.type === "user") {
        return session.user?.name || null;
      }
      return null;
    } catch (err) {
      console.error("Failed to parse session", err);
      return null;
    }
  };
  
  // use the method
  const username = getUsername();
  
  const logout = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });
    
    // Optional: redirect to login page
    window.location.href = "/";
  }

  return <motion.div initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.5
  }} className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`inline-flex items-center justify-center p-3 rounded-lg ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary text-primary-foreground'}`}>
               <ShoppingCart className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : ''}`} />
            </div>
            <h1 className="text-3xl font-bold text-foreground capitalize">
              {username ? `Hello, ${username} :)` : 'G-BOX Admin Dashboard'}
            </h1>
          </div>
          <p className="text-muted-foreground"></p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 justify-between">
          {permissions.viewRevenue && (
            <Card className="p-2 px-4 flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg"
                       fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-foreground">{revenueString}</span>
                </>
              )}
            </Card>
          )}
          {permissions.addStore && (
            <Button onClick={onAddStore}>
              <Plus className="h-4 w-4 mr-2" />
              Add Store
            </Button>
          )}
          {permissions.syncOrders && (
            <Button onClick={() => onSync()} disabled={loading || storesCount === 0} variant="secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Orders
            </Button>
          )}
          {permissions.importExport && (
            <>
              <Button onClick={onImport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={onExport} disabled={ordersCount === 0} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Export
              </Button>
            </>
          )}
          <Button onClick={logout} variant="secondary">
            <Lock className={`h-4 w-4 mr-2`} />
            Logout
          </Button>
        </div>
      </div>
    </motion.div>;
};
export default DashboardHeader;