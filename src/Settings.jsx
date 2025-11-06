import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Palette, Layout, Link, FileText, Eye, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [usefulLinks, setUsefulLinks] = useState([]);
  const [docHubItems, setDocHubItems] = useState([]);
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
      const [dashSettings, links, docs] = await Promise.all([
        window.api.getDashboardSettings(),
        window.api.getUsefulLinks(),
        window.api.getDocHubItems()
      ]);
      setSettings(dashSettings);
      setUsefulLinks(links);
      setDocHubItems(docs);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading settings...</p>
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
          <TabsTrigger value="links" className="data-[state=active]:bg-gray-700">
            <Link className="h-4 w-4 mr-2" />
            Links
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-gray-700">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

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
        <Button onClick={handleSave} disabled={saving} className="flex-1">
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
