import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Key, Globe, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { testStoreConnection } from '@/lib/woocommerce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const StoreConnectionModal = ({ isOpen, onClose, onSaveStore, store }) => {
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        consumerKey: '',
        consumerSecret: ''
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const isEditing = !!store;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                name: store.name || '',
                url: store.url || '',
                consumerKey: store.consumerKey || '',
                consumerSecret: store.consumerSecret || ''
            });
        } else {
            setFormData({ name: '', url: '', consumerKey: '', consumerSecret: '' });
        }
    }, [store, isEditing, isOpen]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.url || !formData.consumerKey || !formData.consumerSecret) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            await testStoreConnection(formData);
            onSaveStore(formData);
            toast({
                title: isEditing ? "Store Updated!" : "Connection Successful!",
                description: isEditing ? `${formData.name} has been updated.` : `${formData.name} has been added.`
            });
        } catch (error) {
            toast({
                title: "Connection Failed",
                description: error.message || "Please check credentials and URL.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl"
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Store className="h-6 w-6 text-primary" />
                                        <CardTitle>{isEditing ? 'Edit Store' : 'Add WooCommerce Store'}</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={onClose}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 border rounded-lg p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-foreground mb-2">How to get your API credentials:</h3>
                                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                                <li>Go to your WooCommerce admin → WooCommerce → Settings → Advanced → REST API</li>
                                                <li>Click "Add Key", give a description, and set permissions to "Read/Write"</li>
                                                <li>Copy the generated Consumer Key and Consumer Secret</li>
                                                <li>Make sure your store URL starts with https://</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="storeName" className="mb-1">
                                            Store Name *
                                        </Label>
                                        <Input
                                            id="storeName"
                                            placeholder="My Awesome Store"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="storeUrl" className="mb-1">
                                            Store URL *
                                        </Label>
                                        <Input
                                            id="storeUrl"
                                            placeholder="https://yourstore.com"
                                            value={formData.url}
                                            onChange={(e) => handleInputChange('url', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="consumerKey" className="mb-1">
                                            Consumer Key *
                                        </Label>
                                        <Input
                                            id="consumerKey"
                                            placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={formData.consumerKey}
                                            onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="consumerSecret" className="mb-1">
                                            Consumer Secret *
                                        </Label>
                                        <Input
                                            id="consumerSecret"
                                            type="password"
                                            placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={formData.consumerSecret}
                                            onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full"
                                        >
                                            {loading ? 'Testing...' : (isEditing ? 'Save Changes' : 'Add & Verify Store')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={onClose}
                                            className="w-full"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StoreConnectionModal;