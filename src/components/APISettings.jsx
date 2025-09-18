import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Key, Copy, Trash, Plus, Eye, EyeOff, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';

const APISettings = () => {
    const [apiKeys, setApiKeys] = useState([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [visibleKeys, setVisibleKeys] = useState({});
    const { toast } = useToast();

    useEffect(() => {
        const keysRef = ref(database, 'apiKeys');
        onValue(keysRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const keysArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setApiKeys(keysArray);
            } else {
                setApiKeys([]);
            }
        });
    }, []);

    const generateNewKey = () => {
        if (!newKeyName.trim()) {
            toast({
                title: 'Error',
                description: 'Please provide a name for the API key.',
                variant: 'destructive',
            });
            return;
        }

        const keysRef = ref(database, 'apiKeys');
        const newKeyRef = push(keysRef);

        const newKey = {
            name: newKeyName,
            key: `wc_dash_key_${uuidv4().replace(/-/g, '')}`,
            createdAt: new Date().toISOString(),
        };

        set(newKeyRef, newKey).then(() => {
            setNewKeyName('');
            toast({
                title: 'API Key Generated!',
                description: `New key "${newKey.name}" has been created.`,
            });
        });
    };

    const deleteKey = (id) => {
        const keyRef = ref(database, `apiKeys/${id}`);
        remove(keyRef).then(() => {
            toast({
                title: 'API Key Deleted',
                description: 'The selected API key has been revoked.',
            });
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied!',
            description: 'The key has been copied to your clipboard.',
        });
    };
    
    const toggleVisibility = (id) => {
        setVisibleKeys(prev => ({...prev, [id]: !prev[id]}));
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link to="/">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">API Settings</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Generate New API Key</CardTitle>
                    <CardDescription>Create a new API key to grant programmatic access to your dashboard data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g., 'Third-Party App Integration'"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                        />
                        <Button onClick={generateNewKey}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Generate Key
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your API Keys</CardTitle>
                    <CardDescription>These keys can be used to access your orders data via the API. Treat them like passwords.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {apiKeys.length === 0 ? (
                            <p className="text-sm text-center text-gray-500 py-4">You haven't generated any API keys yet.</p>
                        ) : (
                            apiKeys.map(apiKey => (
                                <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <Key className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="font-semibold">{apiKey.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-600 font-mono">
                                                    {visibleKeys[apiKey.id] ? apiKey.key : '•'.repeat(apiKey.key.length)}
                                                </p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleVisibility(apiKey.id)}>
                                                    {visibleKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Created on: {new Date(apiKey.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey.key)}>
                                            <Copy className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => deleteKey(apiKey.id)}>
                                            <Trash className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>API Documentation</CardTitle>
                    <CardDescription>
                        Use the following guidelines to interact with your dashboard's data. This is a conceptual guide as a true backend API cannot be hosted from the browser. For a real-world scenario, you would implement these endpoints on a server that has access to the same data source (e.g., your WooCommerce database or a centralized server).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <p className="font-semibold">Authentication</p>
                        <p>Include your API Key in the <code className="bg-gray-200 p-1 rounded font-mono text-xs">Authorization</code> header as a Bearer token.</p>
                        <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto"><code>{`Authorization: Bearer <YOUR_API_KEY>`}</code></pre>
                    </div>
                    <div>
                        <p className="font-semibold">GET /api/orders</p>
                        <p>Retrieves a list of all orders.</p>
                        <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto"><code>{`// Example using JavaScript fetch
fetch('/api/orders', {
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>'
  }
})
.then(res => res.json())
.then(data => console.log(data));`}</code></pre>
                    </div>
                     <div>
                        <p className="font-semibold">POST /api/orders/:id/update-status</p>
                        <p>Updates the status of a specific order.</p>
                        <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto"><code>{`// Example using JavaScript fetch
fetch('/api/orders/123/update-status', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ status: 'completed' })
})
.then(res => res.json())
.then(data => console.log(data));`}</code></pre>
                    </div>
                     <p className="text-xs text-red-600 text-center p-2 bg-red-50 rounded border border-red-200">
                        <strong>Important:</strong> The endpoints above are for documentation purposes only. This front-end application cannot receive API calls. A proper backend server is required to implement this functionality.
                     </p>
                </CardContent>
            </Card>

        </div>
    );
};

export default APISettings;