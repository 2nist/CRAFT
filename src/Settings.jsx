import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Palette, Layout, Link, FileText, Eye, Settings as SettingsIcon, Users, Trash2, Edit2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loadGlobalSettings, writeGlobalSettings } from './plugins/global-settings';
import loggingService from './services/LoggingService';

const THEMES = [
  { value: 'slate', label: 'Slate (Default)', colors: 'bg-slate-900' },
  { value: 'zinc', label: 'Zinc', colors: 'bg-zinc-900' },
  { value: 'stone', label: 'Stone', colors: 'bg-stone-900' },
  { value: 'gray', label: 'Gray', colors: 'bg-gray-900' },
  { value: 'neutral', label: 'Neutral', colors: 'bg-neutral-900' }
];

const ACCENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { value: 'green', label: 'Green', class: 'bg-green-600' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-600' },
  { value: 'red', label: 'Red', class: 'bg-red-600' }
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [gsLoading, setGsLoading] = useState(true);
  const [newGsKey, setNewGsKey] = useState('');
  const [newGsValue, setNewGsValue] = useState('');
  const [newGsType, setNewGsType] = useState('auto');
  const [gsErrors, setGsErrors] = useState({});
  const [newEntryError, setNewEntryError] = useState(null);
  const [usefulLinks, setUsefulLinks] = useState([]);
  const [docHubItems, setDocHubItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', isOEM: false });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newLink, setNewLink] = useState({ title: '', link: '', icon: 'Link' });
  const [newDoc, setNewDoc] = useState({ title: '', path: '', icon: 'FileText' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashSettings, links, docs, customerList] = await Promise.all([
        window.api.getDashboardSettings(),
        window.api.getUsefulLinks(),
        window.api.getDocHubItems(),
        window.customers.getAll()
      ]);
      setSettings(dashSettings);
      setUsefulLinks(links);
      setDocHubItems(docs);
      setCustomers(customerList || []);
      // load global settings JSON from config/global-settings.json if available
      try {
        const raw = await window.app.readFile('config/global-settings.json');
        if (raw) setGlobalSettings(JSON.parse(raw));
      } catch (e) {
        // ignore if missing
        setGlobalSettings({});
      } finally {
        setGsLoading(false);
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      console.log('Attempting to save settings...');
      console.log('Settings:', settings);
      console.log('Links:', usefulLinks);
      console.log('Docs:', docHubItems);
      
      const results = await Promise.all([
        window.api.saveDashboardSettings(settings),
        window.api.saveUsefulLinks(usefulLinks),
        window.api.saveDocHubItems(docHubItems)
      ]);
      
      console.log('Save results:', results);
      setMessage({ type: 'success', text: 'Settings saved successfully! Refresh to see changes.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      console.error('Error details:', error.message, error.stack);
      setMessage({ type: 'error', text: `Failed to save settings: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      await loadData();
      setMessage({ type: 'info', text: 'Settings reset to defaults' });
    }
  };

  const addLink = () => {
    if (newLink.title && newLink.link) {
      setUsefulLinks([...usefulLinks, { ...newLink }]);
      setNewLink({ title: '', link: '', icon: 'Link' });
    }
  };

  const removeLink = (index) => {
    setUsefulLinks(usefulLinks.filter((_, i) => i !== index));
  };

  const addDoc = () => {
    if (newDoc.title && newDoc.path) {
      setDocHubItems([...docHubItems, { ...newDoc }]);
      setNewDoc({ title: '', path: '', icon: 'FileText' });
    }
  };

  const removeDoc = (index) => {
    setDocHubItems(docHubItems.filter((_, i) => i !== index));
  };

  const addCustomer = async () => {
    if (!newCustomer.name.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required' });
      return;
    }

    try {
      const result = await window.customers.add({ 
        name: newCustomer.name.trim(), 
        isOEM: newCustomer.isOEM 
      });
      
      setCustomers([...customers, result].sort((a, b) => a.id.localeCompare(b.id)));
      setNewCustomer({ name: '', isOEM: false });
      setMessage({ type: 'success', text: `Customer added with ID ${result.id}` });

      // Log the customer creation activity
      loggingService.logCustomerActivity(
        'create',
        result.id,
        result.name,
        { isOEM: newCustomer.isOEM, source: 'settings_ui' }
      );
    } catch (error) {
      console.error('Failed to add customer:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to add customer' });
    }
  };

  const deleteCustomer = async (customerId) => {
    if (!confirm(`Delete customer ${customerId}? This cannot be undone.`)) {
      return;
    }

    try {
      // Get customer details before deletion for logging
      const customerToDelete = customers.find(c => c.id === customerId);
      
      await window.customers.delete(customerId);
      setCustomers(customers.filter(c => c.id !== customerId));
      setMessage({ type: 'success', text: 'Customer deleted successfully' });

      // Log the customer deletion activity
      if (customerToDelete) {
        loggingService.logCustomerActivity(
          'delete',
          customerToDelete.id,
          customerToDelete.name,
          { source: 'settings_ui', wasOEM: parseInt(customerToDelete.id) < 100 }
        );
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete customer' });
    }
  };

  const updateCustomer = async (id, name) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required' });
      return;
    }

    try {
      // Get old customer details for logging
      const oldCustomer = customers.find(c => c.id === id);
      
      await window.customers.update({ id, name: name.trim() });
      setCustomers(customers.map(c => c.id === id ? { ...c, name: name.trim() } : c));
      setEditingCustomer(null);
      setMessage({ type: 'success', text: 'Customer updated successfully' });

      // Log the customer update activity
      if (oldCustomer) {
        loggingService.logCustomerActivity(
          'update',
          id,
          name.trim(),
          { 
            source: 'settings_ui', 
            oldName: oldCustomer.name,
            newName: name.trim(),
            wasOEM: parseInt(id) < 100
          }
        );
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update customer' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-slateish/60">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-400">Configure your workspace, theme, and dashboard preferences</p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'bg-red-900/20 border-red-700' : message.type === 'success' ? 'bg-green-900/20 border-green-700' : 'bg-blue-900/20 border-blue-700'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-red-200' : message.type === 'success' ? 'text-green-200' : 'text-blue-200'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="layout" className="space-y-6">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="layout" className="data-[state=active]:bg-gray-700">
            <Layout className="h-4 w-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="runtime" className="data-[state=active]:bg-gray-700">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Runtime
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-gray-700">
            <Users className="h-4 w-4 mr-2" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="links" className="data-[state=active]:bg-gray-700">
            <Link className="h-4 w-4 mr-2" />
            Links
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-gray-700">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
            <TabsTrigger value="global" className="data-[state=active]:bg-gray-700">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Global
            </TabsTrigger>
        </TabsList>

        {/* Runtime Tab */}
        <TabsContent value="runtime" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Database Synchronization</CardTitle>
              <CardDescription>
                Multi-user database sync is now handled automatically by the Sync Manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  The app now uses a local database with automatic synchronization to the network master database.
                  This allows multiple users to work simultaneously without conflicts.
                </p>
                <p>
                  Sync happens automatically every 2 hours, or you can trigger it manually using the Sync Status component in the app.
                </p>
                <p className="text-xs text-gray-400">
                  For more information, see <strong>MULTI_USER_SYNC.md</strong> or <strong>SYNC_QUICK_START.md</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Dashboard Layout</CardTitle>
              <CardDescription>Control which sections appear on your landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'showRecentQuotes', label: 'Recent Quotes', icon: FileText },
                { key: 'showDocumentHub', label: 'Document Hub', icon: FileText },
                { key: 'showUsefulLinks', label: 'Useful Links', icon: Link },
                { key: 'showWelcomeMessage', label: 'Welcome Banner', icon: Eye }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <Label className="text-gray-300">{label}</Label>
                  </div>
                  <Switch
                    checked={settings?.layout?.[key]}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      layout: { ...settings.layout, [key]: checked }
                    })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Display Preferences</CardTitle>
              <CardDescription>Customize how information is displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Card Layout</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      layout: { ...settings.layout, cardStyle: 'compact' }
                    })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings?.layout?.cardStyle === 'compact'
                        ? 'border-blue-500 bg-gray-700'
                        : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-white mb-1">Compact</p>
                    <p className="text-xs text-gray-400">Dense, more items visible</p>
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      layout: { ...settings.layout, cardStyle: 'expanded' }
                    })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings?.layout?.cardStyle === 'expanded'
                        ? 'border-blue-500 bg-gray-700'
                        : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-white mb-1">Expanded</p>
                    <p className="text-xs text-gray-400">Spacious, easier to read</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Export Settings</CardTitle>
              <CardDescription>Configure default export behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Default Export Location</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings?.export?.defaultPath || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      export: { ...settings.export, defaultPath: e.target.value }
                    })}
                    placeholder="C:\Users\YourName\Documents\Exports"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button
                    variant="outline"
                    className="border-gray-600"
                    onClick={async () => {
                      const result = await window.app.showOpenDialog({
                        properties: ['openDirectory']
                      });
                      if (result && result[0]) {
                        setSettings({
                          ...settings,
                          export: { ...settings.export, defaultPath: result[0] }
                        });
                      }
                    }}
                  >
                    Browse
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Default Export Format</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['CSV', 'Excel', 'PDF'].map(format => (
                    <button
                      key={format}
                      onClick={() => setSettings({
                        ...settings,
                        export: { ...settings.export, defaultFormat: format }
                      })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settings?.export?.defaultFormat === format
                          ? 'border-blue-500 bg-gray-700'
                          : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                      }`}
                    >
                      <p className="font-medium text-white">{format}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <Label className="text-gray-300">Include timestamps in filenames</Label>
                  <p className="text-sm text-gray-500">e.g., BOM_2025-11-06_14-30-00.csv</p>
                </div>
                <Switch
                  checked={settings?.export?.includeTimestamp ?? true}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    export: { ...settings.export, includeTimestamp: checked }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Customer Management</CardTitle>
              <CardDescription>Add and manage customers. OEMs (0-99), End Users (100-999)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Customer */}
              <div className="border-b border-gray-700 pb-4 space-y-3">
                <h4 className="font-medium text-white">Add New Customer</h4>
                <div className="flex gap-3">
                  <Input
                    placeholder="Customer Name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomer()}
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600">
                    <input
                      type="checkbox"
                      id="isOEM"
                      checked={newCustomer.isOEM}
                      onChange={(e) => setNewCustomer({ ...newCustomer, isOEM: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="isOEM" className="text-gray-300 cursor-pointer">
                      OEM (0-99)
                    </Label>
                  </div>
                  <Button onClick={addCustomer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  {newCustomer.isOEM 
                    ? 'OEM customers are numbered 0-99 for manufacturers and equipment providers' 
                    : 'End User customers are numbered 100-999 for breweries, distilleries, etc.'}
                </p>
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">Customer List ({customers.length})</h4>
                  <div className="text-xs text-gray-400">
                    OEMs: {customers.filter(c => parseInt(c.id) < 100).length} | 
                    End Users: {customers.filter(c => parseInt(c.id) >= 100).length}
                  </div>
                </div>
                
                {customers.map((customer) => {
                  const isOEM = parseInt(customer.id) < 100;
                  const isEditing = editingCustomer?.id === customer.id;
                  const isDefault = parseInt(customer.id) <= 128; // Approximate default range
                  
                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isOEM 
                          ? 'bg-blue-900/20 border-blue-700/40' 
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                          isOEM 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-600 text-white'
                        }`}>
                          {customer.id}
                        </span>
                        
                        {isEditing ? (
                          <Input
                            value={editingCustomer.name}
                            onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') updateCustomer(customer.id, editingCustomer.name);
                              if (e.key === 'Escape') setEditingCustomer(null);
                            }}
                            onBlur={() => setEditingCustomer(null)}
                            autoFocus
                            className="bg-gray-700 border-gray-600 text-white flex-1"
                          />
                        ) : (
                          <div className="flex-1">
                            <p className="font-medium text-white">{customer.name}</p>
                            {isDefault && (
                              <p className="text-xs text-gray-400">Default customer</p>
                            )}
                          </div>
                        )}
                        
                        <span className={`text-xs px-2 py-1 rounded ${
                          isOEM 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-gray-600/40 text-gray-300'
                        }`}>
                          {isOEM ? 'OEM' : 'End User'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isDefault && !isEditing && (
                          <>
                            <button
                              onClick={() => setEditingCustomer({ id: customer.id, name: customer.name })}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded"
                              title="Edit customer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteCustomer(customer.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                              title="Delete customer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => updateCustomer(customer.id, editingCustomer.name)}
                            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Global Settings Tab */}
          <TabsContent value="global" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Global Settings</CardTitle>
                <CardDescription>Edit `config/global-settings.json` (WYSIWYG)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gsLoading ? (
                  <div className="text-gray-400">Loading global settings...</div>
                ) : (
                  <div className="space-y-3">
                    {Object.keys(globalSettings || {}).length === 0 && (
                      <div className="text-sm text-gray-400">No global settings defined.</div>
                    )}
                    {Object.entries(globalSettings || {}).map(([key, val]) => {
                      const t = typeof val;
                      return (
                        <div key={key} className="p-3 bg-gray-700/50 rounded-lg flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-white">{key}</div>
                              <div className="text-xs text-gray-400">{t}</div>
                            </div>
                            <div className="mt-2">
                              {t === 'boolean' ? (
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!val}
                                    onChange={(e) => setGlobalSettings({ ...globalSettings, [key]: e.target.checked })}
                                  />
                                  <span className="text-sm text-gray-200">{String(val)}</span>
                                </label>
                              ) : t === 'number' ? (
                                <input
                                  type="number"
                                  value={val}
                                  onChange={(e) => setGlobalSettings({ ...globalSettings, [key]: Number(e.target.value) })}
                                  className="bg-gray-700 border border-gray-600 p-2 rounded w-full text-white"
                                />
                              ) : t === 'string' ? (
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => setGlobalSettings({ ...globalSettings, [key]: e.target.value })}
                                  className="bg-gray-700 border border-gray-600 p-2 rounded w-full text-white"
                                />
                              ) : (
                                <div>
                                  <textarea
                                    value={JSON.stringify(val, null, 2)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      try {
                                        const parsed = JSON.parse(raw);
                                        setGlobalSettings({ ...globalSettings, [key]: parsed });
                                        setGsErrors((prev) => {
                                          const next = { ...prev };
                                          delete next[key];
                                          return next;
                                        });
                                      } catch (err) {
                                        // keep string until valid JSON
                                        setGlobalSettings({ ...globalSettings, [key]: raw });
                                        setGsErrors((prev) => ({ ...prev, [key]: 'Invalid JSON' }));
                                      }
                                    }}
                                    className="bg-gray-800 border border-gray-700 p-2 rounded w-full text-white"
                                    rows={6}
                                  />
                                  {gsErrors[key] && (
                                    <div className="mt-2 text-xs text-red-300">{gsErrors[key]}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                const next = { ...globalSettings };
                                delete next[key];
                                setGlobalSettings(next);
                              }}
                              className="px-3 py-1 text-sm bg-red-600 rounded text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="border-t border-gray-700 pt-4 mt-4">
                      <h4 className="font-medium text-white mb-2">Add New Setting</h4>
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          placeholder="key.name"
                          value={newGsKey}
                          onChange={(e) => setNewGsKey(e.target.value)}
                          className="bg-gray-700 border border-gray-600 p-2 rounded text-white col-span-1"
                        />
                        <input
                          placeholder='value (JSON or plain)'
                          value={newGsValue}
                          onChange={(e) => setNewGsValue(e.target.value)}
                          className="bg-gray-700 border border-gray-600 p-2 rounded text-white col-span-2"
                        />
                        <select
                          value={newGsType}
                          onChange={(e) => setNewGsType(e.target.value)}
                          className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                        >
                          <option value="auto">Auto</option>
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="json">JSON</option>
                        </select>
                        <div className="col-span-4 flex gap-2 justify-end">
                          <div className="flex-1 text-left text-xs text-red-300">{newEntryError}</div>
                          <button
                            onClick={() => {
                              setNewEntryError(null);
                              if (!newGsKey) return;
                              let parsed;
                              try {
                                if (newGsType === 'auto') {
                                  parsed = JSON.parse(newGsValue);
                                } else if (newGsType === 'number') {
                                  parsed = Number(newGsValue);
                                } else if (newGsType === 'boolean') {
                                  const lower = String(newGsValue).toLowerCase();
                                  parsed = lower === 'true' || lower === '1';
                                } else if (newGsType === 'json') {
                                  parsed = JSON.parse(newGsValue);
                                } else {
                                  parsed = String(newGsValue);
                                }
                              } catch (e) {
                                setNewEntryError('Value is not valid JSON for chosen type');
                                return;
                              }
                              setGlobalSettings({ ...globalSettings, [newGsKey]: parsed });
                              setNewGsKey('');
                              setNewGsValue('');
                              setNewGsType('auto');
                            }}
                            className="px-3 py-1 bg-blue-600 rounded text-white"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={async () => {
                          try {
                            await writeGlobalSettings(globalSettings, { backup: true });
                            setMessage({ type: 'success', text: 'Global settings saved (backup created)' });
                          } catch (e) {
                            console.error(e);
                            setMessage({ type: 'error', text: 'Failed to save global settings' });
                          }
                        }}
                        disabled={Object.keys(gsErrors).length > 0 || !!newEntryError}
                        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                      >
                        Save Global Settings
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const data = await loadGlobalSettings();
                            setGlobalSettings(data || {});
                            setMessage({ type: 'info', text: 'Reloaded global settings' });
                          } catch (e) {
                            console.error(e);
                            setMessage({ type: 'error', text: 'Failed to reload global settings' });
                          }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded"
                      >
                        Reload
                      </button>
                      <button
                        onClick={() => {
                          // clear cache in runtime helper if present
                          try {
                            window.api && window.api.clearGlobalSettingsCache && window.api.clearGlobalSettingsCache();
                            setMessage({ type: 'info', text: 'Cleared runtime global settings cache' });
                          } catch (e) {}
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded"
                      >
                        Clear Cache
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Useful Links</CardTitle>
              <CardDescription>Manage quick access links on your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usefulLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{link.title}</p>
                    <p className="text-sm text-gray-400">{link.link}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeLink(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="border-t border-gray-700 pt-4 mt-4 space-y-3">
                <h4 className="font-medium text-white">Add New Link</h4>
                <Input
                  placeholder="Title"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  placeholder="URL"
                  value={newLink.link}
                  onChange={(e) => setNewLink({ ...newLink, link: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  placeholder="Icon name (e.g., Link, Database)"
                  value={newLink.icon}
                  onChange={(e) => setNewLink({ ...newLink, icon: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={addLink} className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="docs" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Document Hub</CardTitle>
              <CardDescription>Manage quick access documents and resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {docHubItems.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{doc.title}</p>
                    <p className="text-sm text-gray-400">{doc.path}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeDoc(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="border-t border-gray-700 pt-4 mt-4 space-y-3">
                <h4 className="font-medium text-white">Add New Document</h4>
                <Input
                  placeholder="Title"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  placeholder="Path or URL"
                  value={newDoc.path}
                  onChange={(e) => setNewDoc({ ...newDoc, path: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  placeholder="Icon name (e.g., FileText, BookOpen)"
                  value={newDoc.icon}
                  onChange={(e) => setNewDoc({ ...newDoc, icon: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={addDoc} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={saving || Object.keys(gsErrors).length > 0 || !!newEntryError} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button onClick={handleReset} variant="outline" className="border-gray-600">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
