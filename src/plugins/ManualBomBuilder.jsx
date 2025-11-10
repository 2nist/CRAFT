import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, X, ChevronsUpDown, Copy, Save, AlertCircle, Info, Calculator, ListPlus, Tag, ArrowUpDown, Download, Upload, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ManualBomBuilder() {
  // === STATE ===
  const [bom, setBom] = useState({
    name: "",
    description: "",
    tags: [],
    subAssemblies: [],
    components: [],
  });
  const [bomId, setBomId] = useState(null);
  const [version, setVersion] = useState(1);
  const [parentId, setParentId] = useState(null);
  
  const [costData, setCostData] = useState({
    totalMaterialCost: 0,
    marginPercent: 40.0,
    finalPrice: 0
  });
  
  const [currentTag, setCurrentTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // === DETAIL MODAL STATE ===
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null); // 'component' | 'subAssembly'
  const [detailItem, setDetailItem] = useState(null); // original item (from list)
  const [detailData, setDetailData] = useState(null); // enriched data (from IPC)
  const [detailLoading, setDetailLoading] = useState(false);
  const modalRef = useRef(null);

  const openDetail = useCallback(async (item, type) => {
    try {
      setDetailType(type);
      setDetailItem(item);
      setDetailOpen(true);
      setDetailLoading(true);
      let data = null;
      if (type === 'component') {
        const sku = item.sku || item.partNumber;
        if (sku && window.components?.getBySku) {
          data = await window.components.getBySku(sku);
        } else {
          data = item;
        }
      } else if (type === 'subAssembly') {
        const id = item.subAssemblyId || item.id;
        if (id && window.subAssemblies?.getById) {
          data = await window.subAssemblies.getById(id);
        } else {
          data = item;
        }
      }
      setDetailData(data || item);
    } catch (e) {
      console.error('Failed to load detail data', e);
      setDetailData(item);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailType(null);
    setDetailItem(null);
    setDetailData(null);
    setDetailLoading(false);
  }, []);

  // Accessibility: focus trap + Esc to close
  useEffect(() => {
    if (!detailOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDetail();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Initial focus
    setTimeout(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first && first.focus();
      }
    }, 0);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [detailOpen, closeDetail]);

  // === EFFECTS ===
  // Recalculate BOM cost when items change
  useEffect(() => {
    const expandBom = async () => {
      const { subAssemblies, components } = bom;
      if (subAssemblies.length === 0 && components.length === 0) {
        setCostData(prev => ({ ...prev, totalMaterialCost: 0, finalPrice: 0 }));
        return;
      }
      
      try {
        const result = await window.boms.expand({ subAssemblies, components });
        if (result.success) {
          setCostData(prev => ({
            ...prev,
            totalMaterialCost: result.totalMaterialCost,
            finalPrice: window.calc?.getPriceFromMargin 
              ? window.calc.getPriceFromMargin(result.totalMaterialCost, prev.marginPercent)
              : result.totalMaterialCost / (1 - (prev.marginPercent / 100))
          }));
        }
      } catch (err) {
        console.error('Error expanding BOM:', err);
      }
    };
    expandBom();
  }, [bom.subAssemblies, bom.components]);
  
  // Recalculate price when margin changes
  const handleMarginChange = (e) => {
    const margin = parseFloat(e.target.value) || 0;
    setCostData(prev => ({
      ...prev,
      marginPercent: margin,
      finalPrice: window.calc?.getPriceFromMargin
        ? window.calc.getPriceFromMargin(prev.totalMaterialCost, margin)
        : prev.totalMaterialCost / (1 - (margin / 100))
    }));
  };

  // Recalculate margin when price changes
  const handlePriceChange = (e) => {
    const price = parseFloat(e.target.value) || 0;
    const margin = window.calc?.getMarginFromPrice
      ? window.calc.getMarginFromPrice(prev.totalMaterialCost, price)
      : ((price - costData.totalMaterialCost) / price) * 100;
    
    setCostData(prev => ({
      ...prev,
      finalPrice: price,
      marginPercent: margin
    }));
  };

  // === BOM ITEM HANDLERS ===
  const addItem = (item, type) => {
    setBom(prev => {
      const list = type === 'subAssembly' ? 'subAssemblies' : 'components';
      const key = type === 'subAssembly' ? 'subAssemblyId' : 'sku';
      
      const existing = prev[list].find(i => i[key] === item[key]);
      let newList;
      
      if (existing) {
        // Increment quantity
        newList = prev[list].map(i => 
          i[key] === item[key] ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        // Add new item
        newList = [...prev[list], { ...item, quantity: 1 }];
      }
      return { ...prev, [list]: newList };
    });
  };

  const removeItem = (id, type) => {
    setBom(prev => {
      const list = type === 'subAssembly' ? 'subAssemblies' : 'components';
      const key = type === 'subAssembly' ? 'subAssemblyId' : 'sku';
      const newList = prev[list].filter(i => i[key] !== id);
      return { ...prev, [list]: newList };
    });
  };
  
  const updateQuantity = (id, type, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (qty < 1) return; // Don't allow less than 1
    
    setBom(prev => {
      const list = type === 'subAssembly' ? 'subAssemblies' : 'components';
      const key = type === 'subAssembly' ? 'subAssemblyId' : 'sku';
      const newList = prev[list].map(i => 
        i[key] === id ? { ...i, quantity: qty } : i
      );
      return { ...prev, [list]: newList };
    });
  };

  // === TAG HANDLERS ===
  const handleAddTag = () => {
    if (currentTag && !bom.tags.includes(currentTag)) {
      setBom(prev => ({ ...prev, tags: [...prev.tags, currentTag] }));
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setBom(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  // === SAVE & VERSIONING HANDLERS ===
  const handleSave = async (asNewVersion = false) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    let bomToSave = { ...bom };
    
    if (asNewVersion && bomId) {
      // Create a new version
      bomToSave.parentId = parentId || bomId; // Link to original or parent
      bomToSave.version = version + 1;
      bomToSave.bomId = `BOM-${Date.now()}`; // New unique ID
    } else if (!bomId) {
      // First save
      bomToSave.bomId = `BOM-${Date.now()}`;
      bomToSave.version = 1;
      bomToSave.parentId = null;
    } else {
      // Overwrite current (this logic is for a "draft" state, API saves as new)
      // The API will handle the save-as-new logic
      bomToSave.bomId = bomId;
      bomToSave.version = version;
      bomToSave.parentId = parentId;
    }
    
    bomToSave.createdAt = new Date().toISOString();
    bomToSave.costData = costData; // Snapshot the cost

    try {
      const result = await window.boms.save(bomToSave);
      if (result.success) {
        setSuccess("BOM saved successfully!");
        // Update state to reflect the saved version
        setBomId(result.bom.bomId);
        setVersion(result.bom.version);
        setParentId(result.bom.parentId);
      } else {
        setError(result.error || "Failed to save BOM.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export BOM to CSV
  const handleExportBomToCsv = async () => {
    if (!bom.name && bom.subAssemblies.length === 0 && bom.components.length === 0) {
      alert('No BOM data to export. Please add items to the BOM first.');
      return;
    }

    try {
      const csvRows = [];

      // Header row
      csvRows.push('Section,Field,Value,Index');

      // Basic BOM metadata
      const basicFields = ['name', 'description', 'bomId', 'version', 'parentId'];
      basicFields.forEach(field => {
        csvRows.push(`BOM,${field},${bom[field] || ''},`);
      });

      // Tags
      if (bom.tags && bom.tags.length > 0) {
        bom.tags.forEach((tag, index) => {
          csvRows.push(`BOM,tags[${index}],${tag},`);
        });
      }

      // Cost data
      if (costData) {
        Object.entries(costData).forEach(([key, value]) => {
          csvRows.push(`CostData,${key},${value || ''},`);
        });
      }

      // Sub-assemblies
      if (bom.subAssemblies) {
        bom.subAssemblies.forEach((assembly, index) => {
          Object.entries(assembly).forEach(([key, value]) => {
            csvRows.push(`SubAssemblies,${key},${value || ''},${index}`);
          });
        });
      }

      // Components
      if (bom.components) {
        bom.components.forEach((component, index) => {
          Object.entries(component).forEach(([key, value]) => {
            csvRows.push(`Components,${key},${value || ''},${index}`);
          });
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
      const safeName = (bom.name || 'Unnamed_BOM').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'Unnamed_BOM';
      const filename = `ManualBOM_${safeName}_${timestamp}.csv`;

      await window.app.writeFile(`OUTPUT/ManualBOMs/${filename}`, csvRows.join('\n'));

      alert(`BOM exported successfully to OUTPUT/ManualBOMs/${filename}\n\nThis CSV can be imported back to restore the BOM.`);
    } catch (error) {
      console.error('Failed to export BOM:', error);
      alert(`Failed to export BOM: ${error.message}`);
    }
  };

  // Import BOM from CSV
  const handleImportBomFromCsv = async () => {
    try {
      const result = await window.app.showOpenDialog({
        title: 'Select BOM CSV File',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      const csvContent = await window.app.readFile(filePath);

      if (!csvContent) {
        alert('Failed to read the selected file.');
        return;
      }

      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('Invalid CSV file format.');
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',');
      if (headers.length < 3 || headers[0] !== 'Section' || headers[1] !== 'Field') {
        alert('Invalid CSV format. Expected columns: Section,Field,Value,Index');
        return;
      }

      const parsedData = {};
      const tags = [];
      const subAssemblies = [];
      const components = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 3) continue;

        const section = cols[0];
        const field = cols[1];
        const value = cols[2];
        const index = cols[3] ? parseInt(cols[3]) : null;

        if (section === 'BOM') {
          if (field.includes('[') && field.includes(']')) {
            // Handle array notation like tags[0]
            const arrayMatch = field.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
              const arrayName = arrayMatch[1];
              const arrayIndex = parseInt(arrayMatch[2]);
              if (arrayName === 'tags') {
                tags[arrayIndex] = value;
              }
            }
          } else {
            parsedData[field] = value;
          }
        } else if (section === 'CostData') {
          if (!parsedData.costData) parsedData.costData = {};
          // Convert numeric values
          const numValue = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          parsedData.costData[field] = numValue;
        } else if (section === 'SubAssemblies' && index !== null) {
          if (!subAssemblies[index]) subAssemblies[index] = {};
          // Convert numeric values
          const numValue = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          subAssemblies[index][field] = numValue;
        } else if (section === 'Components' && index !== null) {
          if (!components[index]) components[index] = {};
          // Convert numeric values
          const numValue = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          components[index][field] = numValue;
        }
      }

      // Reconstruct the BOM object
      const importedBom = {
        name: parsedData.name || '',
        description: parsedData.description || '',
        tags: tags.filter(tag => tag), // Remove empty entries
        subAssemblies: subAssemblies.filter(item => Object.keys(item).length > 0),
        components: components.filter(item => Object.keys(item).length > 0),
      };

      // Set the imported BOM
      setBom(importedBom);

      // Update metadata if present
      if (parsedData.bomId) setBomId(parsedData.bomId);
      if (parsedData.version) setVersion(parseInt(parsedData.version) || 1);
      if (parsedData.parentId) setParentId(parsedData.parentId);

      // Update cost data if present
      if (parsedData.costData) {
        setCostData(parsedData.costData);
      }

      alert(`BOM imported successfully from ${filePath.split('\\').pop() || filePath.split('/').pop()}`);
    } catch (error) {
      console.error('Failed to import BOM:', error);
      alert(`Failed to import BOM: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full max-h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 gap-4">
      {/* Left Column (2/3): Add to BOM Search */}
      <Card className="w-2/3 flex flex-col shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="components">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="subAssemblies">Sub-Assemblies</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
            </TabsList>
            <TabsContent value="subAssemblies">
              <SearchableList 
                searchFn={window.subAssemblies.search}
                itemKey="subAssemblyId"
                itemDisplay="description"
                onAdd={(item) => addItem(item, 'subAssembly')}
                onShowDetail={(item) => openDetail(item, 'subAssembly')}
              />
            </TabsContent>
            <TabsContent value="components">
              <SearchableList
                searchFn={window.components.search}
                itemKey="sku"
                itemDisplay="description"
                onAdd={(item) => addItem(item, 'component')}
                onShowDetail={(item) => openDetail(item, 'component')}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Right Column (1/3): Manual BOM Editor */}
      <Card className="w-1/3 flex flex-col shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* BOM ID Version Info */}
          <div className="text-xs text-slate-500 dark:text-slate-400 text-right -mt-2 mb-2">
            {bomId ? `${bomId} (v${version})` : "New BOM"}
          </div>
          
          {/* BOM Name & Description */}
          <div>
            <label className="text-sm font-medium">BOM Name</label>
            <Input 
              placeholder="e.g., 'Big Grove Service Call'" 
              value={bom.name}
              onChange={e => setBom(prev => ({...prev, name: e.target.value}))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input 
              placeholder="Optional details..." 
              value={bom.description}
              onChange={e => setBom(prev => ({...prev, description: e.target.value}))}
            />
          </div>
          
          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex space-x-2">
              <Input 
                placeholder="e.g., 'Service'" 
                value={currentTag}
                onChange={e => setCurrentTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} variant="outline" size="icon"><Plus size={16} /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {bom.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X size={12} className="cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Sub-Assemblies List */}
          <BomSection 
            title="Sub-Assemblies"
            items={bom.subAssemblies}
            itemKey="subAssemblyId"
            type="subAssembly"
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            onShowDetail={(item) => openDetail(item, 'subAssembly')}
          />
          
          {/* Components List */}
          <BomSection 
            title="One-Off Components"
            items={bom.components}
            itemKey="sku"
            type="component"
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            onShowDetail={(item) => openDetail(item, 'component')}
          />
          
          {/* Total Material Cost - Prominent Display */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Material Cost</span>
                <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">${costData.totalMaterialCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Save Area */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
            {error && <div className="text-red-500 text-sm flex items-center"><AlertCircle size={16} className="mr-2" /> {error}</div>}
            {success && <div className="text-green-500 text-sm">{success}</div>}
            
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleExportBomToCsv} className="w-full bg-purple-600 hover:bg-purple-700">
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleImportBomFromCsv} variant="outline" className="w-full">
                <Upload size={16} className="mr-2" />
                Import CSV
              </Button>
            </div>
            
            <Button onClick={() => handleSave(false)} disabled={isLoading} className="w-full">
              <Save size={16} className="mr-2" />
              {isLoading ? "Saving..." : (bomId ? "Save Changes" : "Save BOM")}
            </Button>
            {bomId && (
              <Button onClick={() => handleSave(true)} disabled={isLoading} variant="outline" className="w-full">
                {isLoading ? "Saving..." : `Save as v${version + 1}`}
              </Button>
            )}
          </div>
          
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div ref={modalRef} role="dialog" aria-modal="true" className="w-full max-w-2xl mx-4 rounded-lg shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-accent" />
                <h3 className="text-lg font-semibold">{detailType === 'component' ? 'Component Details' : 'Sub-Assembly Details'}</h3>
              </div>
              <button className="ca-btn-secondary px-2 py-1 rounded" onClick={closeDetail}>
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              {detailLoading ? (
                <div className="text-sm text-slateish/60">Loading…</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-slateish/60">{detailType === 'component' ? 'Part #' : 'ID'}</div>
                      <div className="font-mono">{detailType === 'component' ? (detailData?.sku || detailItem?.sku || detailItem?.partNumber) : (detailData?.subAssemblyId || detailItem?.subAssemblyId)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slateish/60">Vendor</div>
                      <div>{detailData?.manufacturer || detailData?.vendor || '—'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slateish/60">Description</div>
                    <div className="font-medium">{detailData?.description || detailItem?.description || '—'}</div>
                  </div>

                  {detailType === 'component' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slateish/60">Category</div>
                        <div>{detailData?.category || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slateish/60">Price</div>
                        <div className="font-semibold">{detailData?.price != null ? `$${Number(detailData.price).toFixed(2)}` : '—'}</div>
                      </div>
                      {detailData?.voltage && (
                        <div>
                          <div className="text-sm text-slateish/60">Voltage</div>
                          <div>{detailData.voltage}</div>
                        </div>
                      )}
                      {detailData?.stock != null && (
                        <div className="text-right">
                          <div className="text-sm text-slateish/60">Stock</div>
                          <div>{detailData.stock}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      className="ca-btn-primary px-3 py-1.5 rounded"
                      onClick={() => {
                        const item = detailType === 'component' ? {
                          sku: detailData?.sku || detailItem?.sku || detailItem?.partNumber,
                          description: detailData?.description || detailItem?.description,
                          manufacturer: detailData?.manufacturer || detailData?.vendor
                        } : {
                          subAssemblyId: detailData?.subAssemblyId || detailItem?.subAssemblyId,
                          description: detailData?.description || detailItem?.description,
                          category: detailData?.category
                        };
                        addItem(item, detailType);
                        closeDetail();
                      }}
                    >
                      <Plus size={16} className="inline mr-1" /> Add to BOM
                    </button>
                    <button
                      className="ca-btn-secondary px-3 py-1.5 rounded"
                      onClick={() => {
                        const text = detailType === 'component'
                          ? (detailData?.sku || detailItem?.sku || detailItem?.partNumber)
                          : (detailData?.subAssemblyId || detailItem?.subAssemblyId);
                        navigator.clipboard.writeText(String(text || ''));
                      }}
                    >
                      <Copy size={16} className="inline mr-1" /> Copy {detailType === 'component' ? 'SKU' : 'ID'}
                    </button>
                    <button
                      className="ca-btn-secondary px-3 py-1.5 rounded"
                      onClick={() => {
                        const prefill = detailType === 'component'
                          ? (detailData?.sku || detailItem?.sku || detailItem?.description)
                          : (detailData?.description || detailItem?.description);
                        // Try known openers first
                        if (window.openSearchModal) {
                          try { window.openSearchModal(prefill); return; } catch {}
                        }
                        if (window.eventBus?.publish) {
                          try { window.eventBus.publish('SEARCH_OPEN_REQUEST', { query: prefill }); return; } catch {}
                        }
                        // Fallback: dispatch DOM event
                        try {
                          window.dispatchEvent(new CustomEvent('cth:open-global-search', { detail: { query: prefill } }));
                        } catch {}
                      }}
                    >
                      <Search size={16} className="inline mr-1" /> Open in Global Search
                    </button>
                    {detailType === 'component' && (
                      <button
                        className="ca-btn-secondary px-3 py-1.5 rounded"
                        onClick={async () => {
                          try {
                            // Try local/manual system
                            const info = { sku: detailData?.sku || detailItem?.sku, manufacturer: detailData?.manufacturer || detailData?.vendor };
                            if (window.manuals?.smartSearch) {
                              const res = await window.manuals.smartSearch(info);
                              if (res?.url) {
                                window.open(res.url, '_blank');
                              }
                            }
                          } catch (e) {
                            console.error('Manual open failed', e);
                          }
                        }}
                      >
                        <BookOpen size={16} className="inline mr-1" /> View Manual
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Sub-Components ===

function SearchableList({ searchFn, itemKey, itemDisplay, onAdd, onShowDetail }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState(""); // New: sort field

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm.length < 2 && !category) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      const query = { description: searchTerm };
      if (category) query.category = category;
      
      try {
        const data = await searchFn(query);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, category, searchFn]);

  // Sort results based on selected field
  const sortedResults = useMemo(() => {
    if (!sortBy || results.length === 0) return results;
    
    return [...results].sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      // Handle vendor field (could be manufacturer or vendor)
      if (sortBy === 'vendor') {
        aVal = a.manufacturer || a.vendor || '';
        bVal = b.manufacturer || b.vendor || '';
      }
      
      // Handle part field (could be sku or partNumber)
      if (sortBy === 'part') {
        aVal = a.sku || a.partNumber || '';
        bVal = b.sku || b.partNumber || '';
      }
      
      // Numeric sort for voltage
      if (sortBy === 'voltage') {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return aNum - bNum;
      }
      
      // String sort for everything else
      return String(aVal).localeCompare(String(bVal));
    });
  }, [results, sortBy]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search by description..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {itemKey === 'sku' && (
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Sort by...</option>
              <option value="part">Part #</option>
              <option value="description">Description</option>
              <option value="vendor">Vendor</option>
              <option value="category">Category</option>
              <option value="voltage">Voltage</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto mt-3">
        {isLoading && <div className="text-sm text-slate-500 p-2">Searching...</div>}
        {!isLoading && results.length === 0 && searchTerm.length > 1 && <div className="text-sm text-slate-500 p-2">No results found.</div>}
        {!isLoading && results.length === 0 && searchTerm.length < 2 && <div className="text-sm text-slate-400 p-2">Enter at least 2 characters to search...</div>}
        {sortedResults.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {itemKey === 'sku' && <th className="text-left px-2 py-1.5 font-semibold">Part #</th>}
                  <th className="text-left px-2 py-1.5 font-semibold">Description</th>
                  {itemKey === 'sku' && <th className="text-left px-2 py-1.5 font-semibold">Vendor</th>}
                  {itemKey === 'sku' && <th className="text-right px-2 py-1.5 font-semibold">Price</th>}
                  {itemKey !== 'sku' && <th className="text-left px-2 py-1.5 font-semibold">Category</th>}
                  <th className="text-center px-2 py-1.5 font-semibold w-12">Add</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(item => (
                  <tr 
                    key={item[itemKey]} 
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => onShowDetail && onShowDetail(item)}
                  >
                    {itemKey === 'sku' && <td className="px-2 py-1.5 font-mono text-xs">{item.sku || item.partNumber || '-'}</td>}
                    <td className="px-2 py-1.5">{item[itemDisplay]}</td>
                    {itemKey === 'sku' && <td className="px-2 py-1.5 text-xs">{item.manufacturer || item.vendor || '-'}</td>}
                    {itemKey === 'sku' && <td className="px-2 py-1.5 text-right font-medium">{item.price ? `$${item.price.toFixed(2)}` : '-'}</td>}
                    {itemKey !== 'sku' && <td className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">{item.category || '-'}</td>}
                    <td className="px-2 py-1.5 text-center">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onAdd(item); }} className="h-6 w-6 p-0">
                        <Plus size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BomSection({ title, items, itemKey, type, updateQuantity, removeItem, onShowDetail }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">{title} ({items.length})</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {items.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No items added.</p>}
        {items.map(item => (
          <div key={item[itemKey]} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer" onClick={() => onShowDetail && onShowDetail(item)}>
            <Input 
              type="number" 
              value={item.quantity} 
              onChange={e => updateQuantity(item[itemKey], type, e.target.value)}
              className="w-16"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{item.description || item[itemKey]}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item[itemKey]}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeItem(item[itemKey], type); }}>
              <X size={16} className="text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
