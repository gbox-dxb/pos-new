import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Loader2, Truck, Package, MapPin, Calendar, FileText, Settings, Trash, Plus, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';

const useTrackingCompanies = () => {
    const [companies, setCompanies] = useState([]);

    useEffect(() => {
        try {
          const defaultCompany = [
            {
              id: uuidv4(),
              name: 'Panda',
              url: import.meta.env.VITE_PANDA_URL,
              apiKey: import.meta.env.VITE_PANDA_API_KEY
            }, {
              id: uuidv4(),
              name: 'Benex',
              url: import.meta.env.VITE_BENEX_URL,
              apiKey: import.meta.env.VITE_BENEX_API_KEY,
            }
          ];
          setCompanies(defaultCompany);
          localStorage.setItem('trackingCompanies', JSON.stringify(defaultCompany));
          
          /*const storedCompanies = localStorage.getItem('trackingCompanies');
          if (storedCompanies) {
              setCompanies(JSON.parse(storedCompanies));
          } else {
              // Add a default company if none exist
              const defaultCompany = [{
                  id: uuidv4(),
                  name: 'Delivery Panda',
                  url: import.meta.env.VITE_PANDA_URL,
                  apiKey: import.meta.env.VITE_PANDA_API_KEY
              }];
              setCompanies(defaultCompany);
              localStorage.setItem('trackingCompanies', JSON.stringify(defaultCompany));
          }*/
        } catch (error) {
            console.error("Failed to load tracking companies from localStorage", error);
            setCompanies([]);
        }
    }, []);

    const saveCompanies = (newCompanies) => {
        setCompanies(newCompanies);
        localStorage.setItem('trackingCompanies', JSON.stringify(newCompanies));
    };

    return { companies, saveCompanies };
};

const TrackingSettings = ({ companies, saveCompanies }) => {
    const { toast } = useToast();
    const [localCompanies, setLocalCompanies] = useState(companies);

    useEffect(() => {
        setLocalCompanies(companies);
    }, [companies]);

    const handleAddCompany = () => {
        setLocalCompanies([...localCompanies, { id: uuidv4(), name: '', url: '', apiKey: '' }]);
    };

    const handleRemoveCompany = (id) => {
        setLocalCompanies(localCompanies.filter(c => c.id !== id));
    };

    const handleInputChange = (id, field, value) => {
        setLocalCompanies(localCompanies.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleSaveChanges = () => {
        for (const company of localCompanies) {
            if (!company.name || !company.url || !company.apiKey) {
                toast({
                    title: 'Incomplete Information',
                    description: 'Please fill out all fields for each company.',
                    variant: 'destructive',
                });
                return;
            }
        }
        saveCompanies(localCompanies);
        toast({
            title: 'Settings Saved',
            description: 'Your tracking company settings have been updated.',
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Tracking Companies</CardTitle>
                    <CardDescription>Add, edit, or remove your shipping company API credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {localCompanies.map((company) => (
                        <motion.div
                            key={company.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="p-4 border rounded-lg space-y-3 bg-muted/30"
                        >
                            <div className="flex justify-between items-center">
                                <Input
                                    placeholder="Company Name"
                                    value={company.name}
                                    onChange={(e) => handleInputChange(company.id, 'name', e.target.value)}
                                    className="text-lg font-semibold !m-0 !p-0 border-none focus-visible:ring-0 bg-transparent"
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveCompany(company.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <Input
                                placeholder="Tracking API URL"
                                value={company.url}
                                onChange={(e) => handleInputChange(company.id, 'url', e.target.value)}
                            />
                            <Input
                                type=""
                                placeholder="API Key"
                                value={company.apiKey}
                                onChange={(e) => handleInputChange(company.id, 'apiKey', e.target.value)}
                            />
                        </motion.div>
                    ))}
                    <div className="flex justify-between items-center pt-4">
                        <Button variant="outline" onClick={handleAddCompany}>
                            <Plus className="mr-2 h-4 w-4" /> Add Company
                        </Button>
                        <Button onClick={handleSaveChanges}>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


const Tracking = () => {
  const [awbNumbers, setAwbNumbers] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { companies, saveCompanies } = useTrackingCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const handleTrack = async () => {
      const numbers = awbNumbers.split(',').map(num => num.trim()).filter(Boolean);
      console.log('numbers', numbers);
    if (numbers.length === 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter at least one AWB number.',
        variant: 'destructive',
      });
      return;
    }

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    if (!selectedCompany) {
        toast({
            title: 'No Company Selected',
            description: 'Please select a shipping company.',
            variant: 'destructive',
        });
        return;
    }

    setLoading(true);
    setTrackingData(null);

    try {
      const proxyUrl = `${import.meta.env.VITE_CORS_PROXY_URL}${selectedCompany.url}`;
      console.log('proxyUrl', proxyUrl);
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': selectedCompany.apiKey,
        },
        body: JSON.stringify({ AwbNumber: numbers }),
      });

        console.log(response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === 1) {
        setTrackingData(data.TrackResponse);
        toast({
          title: 'Tracking Success',
          description: `Found tracking information for ${data.TrackResponse.length} shipment(s).`,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch tracking data.');
      }
    } catch (error) {
      console.error('Tracking API Error:', error);
      toast({
        title: 'Tracking Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="track" className="w-full">
        <CardHeader className="px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                        <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Shipment Tracking</CardTitle>
                        <CardDescription>Track shipments or manage your API settings.</CardDescription>
                    </div>
                </div>
                <TabsList>
                    <TabsTrigger value="track"><Search className="mr-2 h-4 w-4" />Track</TabsTrigger>
                    <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
                </TabsList>
            </div>
        </CardHeader>
        <TabsContent value="track">
            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select Company" />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map(company => (
                                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="text"
                            value={awbNumbers}
                            onChange={(e) => setAwbNumbers(e.target.value)}
                            placeholder="e.g., XXXXXXX12, XXXXXXX13"
                            className="flex-grow"
                        />
                        <Button onClick={handleTrack} disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Tracks
                        </Button>
                    </div>

                    {trackingData && (
                        <div className="space-y-6">
                            {trackingData.map((item, index) => (
                            <motion.div
                                key={item.Shipment.awb_number}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="overflow-hidden">
                                <CardHeader className="bg-muted/50 p-4 border-b">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <Package className="h-6 w-6 text-primary" />
                                            <div>
                                                <CardTitle className="text-lg">AWB: {item.Shipment.awb_number}</CardTitle>
                                                <p className="text-sm font-medium text-primary">{item.Shipment.current_status}</p>
                                            </div>
                                        </div>
                                        <a href={item.Shipment.AwbPdf} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                            <Button variant="outline" size="sm">
                                                <FileText className="mr-2 h-4 w-4" /> View PDF
                                            </Button>
                                        </a>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Destination</p>
                                                <p className="text-muted-foreground">{item.Shipment.ShipmentAddress.address}, {item.Shipment.ShipmentAddress.city}, {item.Shipment.ShipmentAddress.country}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Last Update</p>
                                                <p className="text-muted-foreground">{new Date(item.Shipment.status_datetime).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                    <h4 className="font-semibold mb-2">Activity</h4>
                                    <div className="border-l-2 border-primary/20 pl-4 space-y-4">
                                        {item.Shipment.Activity.map((activity, actIndex) => (
                                        <div key={actIndex} className="relative">
                                            <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary"></div>
                                            <p className="font-semibold text-sm">{activity.status}: <span className="font-normal">{activity.details}</span></p>
                                            <p className="text-xs text-muted-foreground">{new Date(activity.datetime).toLocaleString()}</p>
                                        </div>
                                        ))}
                                    </div>
                                    </div>
                                </CardContent>
                                </Card>
                            </motion.div>
                            ))}
                        </div>
                    )}
                    
                    {!loading && !trackingData && (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center p-4">
                            <Truck className="h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-lg font-semibold">Ready to Track</p>
                            <p className="text-sm text-muted-foreground">Enter your Air Waybill (AWB) numbers above to see shipment details.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <p className="mt-4 text-lg font-semibold">Fetching Tracking Data...</p>
                            <p className="text-sm text-muted-foreground">Please wait a moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="settings">
            <TrackingSettings companies={companies} saveCompanies={saveCompanies} />
        </TabsContent>
    </Tabs>
  );
};

export default Tracking;