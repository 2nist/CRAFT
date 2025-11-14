import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, CheckCircle, XCircle, FileText, Map, Settings, Package, Loader2, ArrowRight } from 'lucide-react';

const REQUIRED_COLUMNS = ['productName', 'assemblyName', 'sku', 'quantity'];
const OPTIONAL_COLUMNS = ['assemblyDescription', 'category', 'voltage', 'amps', 'protection', 'type', 'notes'];

export default function LegacyBomImporter({ context }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvContent, setCsvContent] = useState("");
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  
  const [columnMap, setColumnMap] = useState(
    REQUIRED_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: "" }), {
      ...OPTIONAL_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: "" }), {})
    })
  );
  
  const [productNames, setProductNames] = useState([]);
  const [productCodeMap, setProductCodeMap] = useState({});
  const [allProductCodes, setAllProductCodes] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load the master product list (schema) on mount
  useEffect(() => {
    async function loadProductSchema() {
      try {
        const products = await window.schemas.getProduct();
        setAllProductCodes(products || []);
      } catch (err) {
        setError(`Failed to load product schema: ${err.message}`);
      }
    }
    loadProductSchema();
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      console.log('File selected:', f.name);
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File loaded, size:', e.target.result.length);
        setCsvContent(e.target.result);
      };
      reader.readAsText(f);
    }
  };

  const goToStep2 = async () => {
    if (!csvContent) {
      setError("Please upload a CSV file first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('Getting CSV headers...');
      const result = await window.bomImporter.getCsvHeaders(csvContent);
      console.log('Header detection result:', result);
      if (result.headers && result.headers.length > 0) {
        setCsvHeaders(result.headers);
        setHeaderRowIndex(result.headerRowIndex);
        console.log('Moving to step 2');
        setStep(2);
      } else {
        setError("Could not find a valid header row. Please check your file.");
      }
    } catch (err) {
      console.error('Error getting headers:', err);
      setError(`Failed to parse CSV: ${err.message}`);
    }
    setIsLoading(false);
  };

  const handleColumnMapChange = (ourField, csvHeader) => {
    setColumnMap(prev => ({ ...prev, [ourField]: csvHeader }));
  };

  const goToStep3 = () => {
    // Check if all *required* columns are mapped
    const missing = REQUIRED_COLUMNS.filter(col => !columnMap[col]);
    if (missing.length > 0) {
      setError(`Please map all required fields: ${missing.join(', ')}`);
      return;
    }
    
    // Auto-detect product names from the CSV
    const productColName = columnMap.productName;
    console.log('Product column name:', productColName);
    console.log('CSV headers:', csvHeaders);
    console.log('Header index:', csvHeaders.indexOf(productColName));
    
    const uniqueProductNames = new Set(
      csvContent.split('\n').slice(headerRowIndex + 1)
        .map(row => row.split(',')[csvHeaders.indexOf(productColName)]?.trim())
        .filter(Boolean)
    );
    
    console.log('Unique product names found:', Array.from(uniqueProductNames));
    setProductNames(Array.from(uniqueProductNames));
    
    // Auto-map any names that match existing product names
    const newProductCodeMap = {};
    Array.from(uniqueProductNames).forEach(name => {
      const existingProduct = allProductCodes.find(p => p.name === name);
      if (existingProduct) {
        console.log(`Mapping "${name}" to existing product ${existingProduct.code}`);
        newProductCodeMap[name] = existingProduct.code;
      } else {
        console.log(`Creating new product entry for "${name}"`);
        // Create the object structure immediately for new products
        newProductCodeMap[name] = { newCode: "", newName: name };
      }
    });
    setProductCodeMap(newProductCodeMap);
    
    console.log('Product code map:', newProductCodeMap);
    
    setError(null);
    setStep(3);
  };

  const handleProductMapChange = (csvProductName, value) => {
    setProductCodeMap(prev => ({
      ...prev,
      [csvProductName]: value === "CREATE_NEW" ? { newCode: "", newName: csvProductName } : value
    }));
  };

  const handleNewProductChange = (csvProductName, key, value) => {
    setProductCodeMap(prev => ({
      ...prev,
      [csvProductName]: {
        ...prev[csvProductName],
        [key]: value
      }
    }));
  };

  const goToStep4 = () => {
    console.log('goToStep4 called, productCodeMap:', productCodeMap);
    
    // Check if there are any products to map
    if (Object.keys(productCodeMap).length === 0) {
      setError('No products found in CSV. Please check your file.');
      return;
    }
    
    // Validate that all products are mapped or new ones are fully defined
    for (const [name, mapping] of Object.entries(productCodeMap)) {
      if (typeof mapping === 'object') {
        if (!mapping.newCode || !mapping.newName) {
          setError(`Please provide a code and name for the new product: "${name}"`);
          return;
        }
        if (allProductCodes.find(p => p.code === mapping.newCode)) {
          setError(`Product code "${mapping.newCode}" already exists. Please choose a unique code.`);
          return;
        }
      } else if (!mapping) {
        setError(`Please map the product: "${name}"`);
        return;
      }
    }
    setError(null);
    setStep(4);
  };

  const handleProcessImport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.bomImporter.processImport({
        csvContent,
        headerRowIndex,
        columnMap,
        productCodeMap
      });
      
      if (result.success) {
        setSuccess(`Import Complete! ${result.assembliesCreated} new assemblies created. ${result.productsUpdated} products updated.`);
      } else {
        setError(result.error || "An unknown error occurred during import.");
      }
    } catch (err) {
      setError(`Failed to process import: ${err.message}`);
    }
    setIsLoading(false);
  };

  const resetImporter = () => {
    setStep(1);
    setFile(null);
    setCsvContent("");
    setCsvHeaders([]);
    setHeaderRowIndex(0);
    setColumnMap(REQUIRED_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: "" }), { ...OPTIONAL_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: "" }), {}) }));
    setProductNames([]);
    setProductCodeMap({});
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  };

  const renderStep = () => {
    console.log('Rendering step:', step);
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload Your BOM</CardTitle>
              <CardDescription>Upload your legacy BOM in .csv format. The importer will find the header row automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="file" accept=".csv" onChange={handleFileChange} className="file:text-primary-foreground file:bg-primary file:hover:bg-primary/90 file:font-medium" />
              {file && (
                <div className="mt-4 p-4 bg-muted rounded-lg flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-3" />
                  <span className="font-medium text-foreground">{file.name}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={goToStep2} disabled={!file || isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Map className="mr-2 h-4 w-4" />}
                Map Columns
              </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Map Columns</CardTitle>
              <CardDescription>Match our system's fields to the headers found in your CSV file. This is how we know what's what.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-foreground">Required Fields</h3>
              {REQUIRED_COLUMNS.map(ourField => (
                <ColumnMapper key={ourField} ourField={ourField} csvHeaders={csvHeaders} columnMap={columnMap} onChange={handleColumnMapChange} isRequired={true} />
              ))}
              <h3 className="font-semibold text-foreground mt-6">Optional Attributes</h3>
              <p className="text-sm text-muted-foreground">Map these if you have them. They add powerful, searchable data to your assemblies.</p>
              {OPTIONAL_COLUMNS.map(ourField => (
                <ColumnMapper key={ourField} ourField={ourField} csvHeaders={csvHeaders} columnMap={columnMap} onChange={handleColumnMapChange} />
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={goToStep3} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                Configure Products
              </Button>
            </CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Map Products</CardTitle>
              <CardDescription>
                We found the following products in your CSV. Map them to an existing Product Code or create a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {productNames.map(name => (
                <div key={name} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">CSV Product Name</label>
                      <div className="font-semibold text-lg text-foreground">{name}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">Map to System Product</label>
                      <Select value={typeof productCodeMap[name] === 'object' ? 'CREATE_NEW' : productCodeMap[name]} onValueChange={(value) => handleProductMapChange(name, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="CREATE_NEW" value="CREATE_NEW" className="font-bold text-primary">-- Create new product... --</SelectItem>
                          {allProductCodes.map(p => (
                            <SelectItem key={p.code} value={p.code}>{p.code} - {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {typeof productCodeMap[name] === 'object' && (
                    <div className="mt-4 p-3 bg-muted rounded-md grid grid-cols-2 gap-4">
                      <Input
                        placeholder="New Product Code (e.g., 700)"
                        value={productCodeMap[name].newCode}
                        onChange={(e) => handleNewProductChange(name, 'newCode', e.target.value)}
                      />
                      <Input
                        placeholder="New Product Name"
                        value={productCodeMap[name].newName}
                        onChange={(e) => handleNewProductChange(name, 'newName', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={goToStep4} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                Review & Import
              </Button>
            </CardFooter>
          </Card>
        );
      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Confirm & Import</CardTitle>
              <CardDescription>Review your mappings. When ready, click "Confirm Import" to process the file and populate your libraries.</CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Import Successful!</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Column Map:</h4>
                    <ul className="list-disc list-inside p-3 bg-muted rounded-md">
                      {Object.entries(columnMap).filter(([key, val]) => val).map(([key, val]) => (
                        <li key={key} className="text-sm"><span className="font-medium text-foreground">{key}</span> will use your column <span className="font-mono text-primary">"{val}"</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Product Map:</h4>
                    <ul className="list-disc list-inside p-3 bg-muted rounded-md">
                      {Object.entries(productCodeMap).map(([name, mapping]) => (
                        <li key={name} className="text-sm">
                          <span className="font-mono text-primary">"{name}"</span> will be mapped to: {
                            typeof mapping === 'object' 
                            ? <span className="font-medium text-green-600 dark:text-green-400">NEW Product ({mapping.newCode} - {mapping.newName})</span>
                            : <span className="font-medium text-foreground">{mapping}</span>
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isLoading}>Back</Button>
              {success ? (
                <Button onClick={resetImporter}>Start New Import</Button>
              ) : (
                <Button onClick={handleProcessImport} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Confirm Import
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">Legacy BOM Importer</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {renderStep()}
    </div>
  );
}

function ColumnMapper({ ourField, csvHeaders, columnMap, onChange, isRequired = false }) {
  // Filter out empty headers from CSV
  const validHeaders = csvHeaders.filter(h => h && h.trim() !== '');
  
  // Friendly labels for display
  const labelMap = {
    productName: 'Product Name',
    assemblyName: 'Assembly Name',
    sku: 'Component SKU',
    quantity: 'Component Quantity',
    assemblyDescription: 'Assembly Description',
    category: 'Assembly Category',
    voltage: 'Voltage',
    amps: 'Amperage',
    protection: 'Protection Rating',
    type: 'Type',
    notes: 'Component Notes'
  };
  
  return (
    <div className="grid grid-cols-2 items-center gap-4">
      <label className="text-sm font-medium text-right">
        {labelMap[ourField] || ourField} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <Select value={columnMap[ourField] || "__SKIP__"} onValueChange={(value) => onChange(ourField, value === "__SKIP__" ? "" : value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a column from your file..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__SKIP__">-- (Skip) --</SelectItem>
          {validHeaders.map(header => (
            <SelectItem key={header} value={header}>{header}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
