import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, ArrowRight, Clock, Wrench, Code, Package, Copy, Check } from 'lucide-react';

// Re-usable Input with Icon
const IconInput = ({ label, value, onValueChange, placeholder, icon: Icon, type = 'number', step = 'any' }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 pl-10 border border-input bg-background rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
      />
    </div>
  </div>
);

const ResultCard = ({ label, value, icon: Icon, isPrice = false }) => (
  <div className="p-4 bg-muted rounded-lg">
    <div className="flex items-center mb-1">
      <Icon className="w-4 h-4 text-muted-foreground mr-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${isPrice ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
      {value}
    </p>
  </div>
);

export default function MarginCalculator() {
  const [mode, setMode] = useState('FORWARD');
  
  // Input fields
  const [estimatedBOM, setEstimatedBOM] = useState('20');
  const [engineeringHours, setEngineeringHours] = useState('1');
  const [productionHours, setProductionHours] = useState('0');
  const [programmingHours, setProgrammingHours] = useState('0');
  const [otherCosts, setOtherCosts] = useState('0');
  const [overheadPercent, setOverheadPercent] = useState('0.25');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [targetMargin, setTargetMargin] = useState('0.25');
  
  // Calculated values
  const [laborCost, setLaborCost] = useState(0);
  const [totalCOGS, setTotalCOGS] = useState(0);
  const [profit, setProfit] = useState(0);
  const [marginPercent, setMarginPercent] = useState(0);
  const [priceForTargetMargin, setPriceForTargetMargin] = useState(0);
  
  // Copy state
  const [hasCopied, setHasCopied] = useState(false);
  
  // Database save/load state
  const [quoteNumber, setQuoteNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [customer, setCustomer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Parse all inputs
    const bom = parseFloat(estimatedBOM) || 0;
    const engHours = parseFloat(engineeringHours) || 0;
    const prodHours = parseFloat(productionHours) || 0;
    const progHours = parseFloat(programmingHours) || 0;
    const other = parseFloat(otherCosts) || 0;
    const overhead = parseFloat(overheadPercent) || 0;
    const purchase = parseFloat(purchasePrice) || 0;
    const margin = parseFloat(targetMargin) || 0;

    // Labor Cost = Engineering*60 + Production*35 + Programming*85
    const labor = (engHours * 60) + (prodHours * 35) + (progHours * 85);
    setLaborCost(labor);

    // Total COGS = BOM + Labor + OtherCosts + (Overhead% * Purchase)
    const cogs = bom + labor + other + (overhead * purchase);
    setTotalCOGS(cogs);

    if (mode === 'FORWARD') {
      // Forward: Calculate margin from purchase price
      // Profit = Purchase - COGS
      const profitCalc = purchase - cogs;
      setProfit(profitCalc);
      
      // Margin % = Profit / Purchase (if Purchase > 0)
      const marginCalc = purchase === 0 ? 0 : (profitCalc / purchase);
      setMarginPercent(marginCalc);
      
      setPriceForTargetMargin(0); // Not used in forward mode
    } else {
      // Reverse: Calculate price from target margin
      // Price = (BOM + Labor + Other) / (1 - Overhead% - TargetMargin%)
      const price = (bom + labor + other) / (1 - overhead - margin);
      setPriceForTargetMargin(price);
      
      // Profit = Price - COGS
      const profitCalc = price - cogs;
      setProfit(profitCalc);
      
      // Margin is the target margin in reverse mode
      setMarginPercent(margin);
    }
  }, [mode, estimatedBOM, engineeringHours, productionHours, programmingHours, otherCosts, overheadPercent, purchasePrice, targetMargin]);

  const formatCurrency = (num) => {
    if (isNaN(num)) return '$0.00';
    return '$' + num.toFixed(2);
  };

  const formatPercent = (num) => {
    if (isNaN(num)) return '0.00%';
    return (num * 100).toFixed(2) + '%';
  };

  const handleSaveToDatabase = async () => {
    if (!quoteNumber.trim()) {
      setSaveMessage('Please enter a quote number');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const marginData = {
        quoteNumber: quoteNumber.trim(),
        projectName: projectName.trim(),
        customer: customer.trim(),
        mode,
        inputs: {
          estimatedBOM: parseFloat(estimatedBOM) || 0,
          engineeringHours: parseFloat(engineeringHours) || 0,
          productionHours: parseFloat(productionHours) || 0,
          programmingHours: parseFloat(programmingHours) || 0,
          otherCosts: parseFloat(otherCosts) || 0,
          overheadPercent: parseFloat(overheadPercent) || 0,
          purchasePrice: parseFloat(purchasePrice) || 0,
          targetMargin: parseFloat(targetMargin) || 0
        },
        results: {
          laborCost,
          totalCOGS,
          profit,
          marginPercent,
          priceForTargetMargin
        }
      };

      const result = await window.marginCalc.save(marginData);
      
      if (result.success) {
        setSaveMessage('✓ Saved to database');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      setSaveMessage('✗ Error saving: ' + error.message);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromDatabase = async () => {
    if (!quoteNumber.trim()) {
      setSaveMessage('Please enter a quote number to load');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    setSaveMessage('');

    try {
      const result = await window.marginCalc.get(quoteNumber.trim());
      
      if (result.success && result.data) {
        const { mode: savedMode, inputs, results } = result.data;
        
        setMode(savedMode);
        setEstimatedBOM(inputs.estimatedBOM.toString());
        setEngineeringHours(inputs.engineeringHours.toString());
        setProductionHours(inputs.productionHours.toString());
        setProgrammingHours(inputs.programmingHours.toString());
        setOtherCosts(inputs.otherCosts.toString());
        setOverheadPercent(inputs.overheadPercent.toString());
        setPurchasePrice(inputs.purchasePrice.toString());
        setTargetMargin(inputs.targetMargin.toString());
        
        setProjectName(result.projectName || '');
        setCustomer(result.customer || '');
        
        setSaveMessage('✓ Loaded from database');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('No calculation found for this quote number');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading from database:', error);
      setSaveMessage('✗ Error loading: ' + error.message);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResults = () => {
    const results = [];
    results.push('=== MARGIN CALCULATOR RESULTS ===\n');
    results.push(`Mode: ${mode === 'FORWARD' ? 'Forward (Price → Margin)' : 'Reverse (Margin → Price)'}\n`);
    results.push('\nINPUTS:');
    results.push(`  Estimated BOM: ${formatCurrency(parseFloat(estimatedBOM) || 0)}`);
    results.push(`  Engineering Hours: ${engineeringHours} hrs @ $60/hr`);
    results.push(`  Production Hours: ${productionHours} hrs @ $35/hr`);
    results.push(`  Programming Hours: ${programmingHours} hrs @ $85/hr`);
    results.push(`  Other Costs: ${formatCurrency(parseFloat(otherCosts) || 0)}`);
    results.push(`  Overhead %: ${formatPercent(parseFloat(overheadPercent) || 0)}`);
    if (mode === 'FORWARD') {
      results.push(`  Purchase Price: ${formatCurrency(parseFloat(purchasePrice) || 0)}`);
    } else {
      results.push(`  Target Margin %: ${formatPercent(parseFloat(targetMargin) || 0)}`);
    }
    results.push('\nCALCULATED RESULTS:');
    results.push(`  Labor Cost: ${formatCurrency(laborCost)}`);
    results.push(`  Total COGS: ${formatCurrency(totalCOGS)}`);
    if (mode === 'REVERSE') {
      results.push(`  Price for Target Margin: ${formatCurrency(priceForTargetMargin)}`);
    }
    results.push(`  Profit: ${formatCurrency(profit)}`);
    results.push(`  Margin %: ${formatPercent(marginPercent)}`);
    
    const text = results.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-foreground mb-4">Margin Calculator</h1>
      
      {/* Database Save/Load Section */}
      <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quote Number *</label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="e.g., CA251114001-XX..."
              className="w-full p-2 border border-input bg-background rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Optional"
              className="w-full p-2 border border-input bg-background rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Customer</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Optional"
              className="w-full p-2 border border-input bg-background rounded-md text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
          <button
            onClick={handleLoadFromDatabase}
            disabled={isLoading}
            className="px-4 py-2 bg-info text-white rounded-md hover:bg-info/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? 'Loading...' : 'Load from Database'}
          </button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>
      
      {/* Mode Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setMode('FORWARD')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === 'FORWARD'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Forward (Price → Margin)
        </button>
        <button
          onClick={() => setMode('REVERSE')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === 'REVERSE'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Reverse (Margin → Price)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          <div className="p-6 bg-card rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Cost Inputs</h2>
            
            <IconInput
              label="Estimated BOM"
              value={estimatedBOM}
              onValueChange={setEstimatedBOM}
              placeholder="0.00"
              icon={Package}
            />
            
            <IconInput
              label="Engineering Hours"
              value={engineeringHours}
              onValueChange={setEngineeringHours}
              placeholder="0"
              icon={Wrench}
            />
            
            <IconInput
              label="Production Hours"
              value={productionHours}
              onValueChange={setProductionHours}
              placeholder="0"
              icon={Clock}
            />
            
            <IconInput
              label="Programming Hours"
              value={programmingHours}
              onValueChange={setProgrammingHours}
              placeholder="0"
              icon={Code}
            />
            
            <IconInput
              label="Other Costs"
              value={otherCosts}
              onValueChange={setOtherCosts}
              placeholder="0.00"
              icon={DollarSign}
            />
          </div>

          <div className="p-6 bg-card rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Parameters</h2>
            
            <IconInput
              label="Overhead % (decimal)"
              value={overheadPercent}
              onValueChange={setOverheadPercent}
              placeholder="0.25"
              icon={Percent}
              step="0.01"
            />
            
            {mode === 'FORWARD' ? (
              <IconInput
                label="Purchase Price"
                value={purchasePrice}
                onValueChange={setPurchasePrice}
                placeholder="0.00"
                icon={DollarSign}
              />
            ) : (
              <IconInput
                label="Target Margin % (decimal)"
                value={targetMargin}
                onValueChange={setTargetMargin}
                placeholder="0.25"
                icon={Percent}
                step="0.01"
              />
            )}
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4">
          <div className="p-6 bg-card rounded-lg shadow space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Calculated Results</h2>
              <button
                onClick={handleCopyResults}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  hasCopied 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-transparent border border-border text-foreground hover:border-accent hover:text-accent'
                }`}
                title="Copy results to clipboard"
              >
                {hasCopied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
            
            <ResultCard
              label="Labor Cost"
              value={formatCurrency(laborCost)}
              icon={Clock}
            />
            
            <ResultCard
              label="Total COGS"
              value={formatCurrency(totalCOGS)}
              icon={Package}
            />
            
            {mode === 'REVERSE' && (
              <ResultCard
                label="Price for Target Margin"
                value={formatCurrency(priceForTargetMargin)}
                icon={DollarSign}
                isPrice={true}
              />
            )}
            
            <ResultCard
              label="Profit"
              value={formatCurrency(profit)}
              icon={DollarSign}
              isPrice={true}
            />
            
            <ResultCard
              label={mode === 'FORWARD' ? 'Calculated Margin %' : 'Target Margin %'}
              value={formatPercent(marginPercent)}
              icon={Percent}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted-foreground text-center">
        <strong>Forward Mode:</strong> Enter costs and purchase price to calculate margin.
        <br />
        <strong>Reverse Mode:</strong> Enter costs and target margin to calculate required price.
      </div>
    </div>
  );
}
