import React from 'react';
import { Helmet } from 'react-helmet';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import WooCommerceDashboard from '@/components/WooCommerceDashboard';
import { AccessControlProvider } from '@/contexts/AccessControlContext';
import Login from '@/components/Login';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
	return (
		<>
			<Helmet>
				<title>WooCommerce Multi-Store Dashboard</title>
				<meta name="description" content="Centralize all your WooCommerce orders from multiple stores in one powerful dashboard" />
				<meta property="og:title" content="WooCommerce Multi-Store Dashboard" />
				<meta property="og:description" content="Centralize all your WooCommerce orders from multiple stores in one powerful dashboard" />
			</Helmet>
			<main>
				<AccessControlProvider>
					<Routes>
						<Route path="/login" element={<Login />} />
						<Route 
							path="/*" 
							element={
								<ProtectedRoute>
									<WooCommerceDashboard />
								</ProtectedRoute>
							} 
						/>
					</Routes>
				</AccessControlProvider>
				<Toaster />
			</main>
		</>
	);
}

export default App;