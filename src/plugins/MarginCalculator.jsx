import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, ArrowRight, Clock, Wrench, Code, Package } from 'lucide-react';

// Re-usable Input with Icon
const IconInput = ({ label, value, onValueChange, placeholder, icon: Icon, type = 'number', step = 'any' }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </div>
);

const ResultCard = ({ label, value, icon: Icon, isPrice = false }) => (
  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
    <div className="flex items-center mb-1">
      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Margin Calculator</h1>
      
      {/* Mode Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setMode('FORWARD')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === 'FORWARD'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Forward (Price → Margin)
        </button>
        <button
          onClick={() => setMode('REVERSE')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            mode === 'REVERSE'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Reverse (Margin → Price)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Cost Inputs</h2>
            
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

          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Parameters</h2>
            
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
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Calculated Results</h2>
            
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

      <div className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center">
        <strong>Forward Mode:</strong> Enter costs and purchase price to calculate margin.
        <br />
        <strong>Reverse Mode:</strong> Enter costs and target margin to calculate required price.
      </div>
    </div>
  );
}
