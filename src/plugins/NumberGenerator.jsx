import React, { useState, useEffect } from 'react';
import { Check, Copy, FileText } from 'lucide-react';
import loggingService from '../services/LoggingService';

const SelectCode = ({ label, code, options, onCodeChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400">{label}</label>
    <select 
      value={code} 
      onChange={e => onCodeChange(e.target.value)}
      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
    >
      <option value="">Select...</option>
      {options.map(opt => <option key={opt.const} value={opt.const}>{opt.const} - {opt.description}</option>)}
    </select>
  </div>
);

const SelectCustomer = ({ value, onChange }) => {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    const load = async () => {
      const data = await window.customers.getAll();
      setCustomers(data);
    };
    load();
  }, []);
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400">Customer (3-digit ID number)</label>
      <select 
        value={value} 
        onChange={onChange}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
      >
        <option value="">Select Customer...</option>
        {customers.map(c => {
          const customerId = typeof c.id === 'number' ? c.id : parseInt(c.id) || 0;
          const paddedId = customerId.toString().padStart(3, '0');
          return <option key={c.id} value={c.id}>{c.name} (ID: {paddedId})</option>;
        })}
      </select>
    </div>
  );
};

export default function NumberGenerator({ context }) {
  const [mode, setMode] = useState('quote'); // 'quote' or 'project'
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [codes, setCodes] = useState({ industry: '', product: '', control: '', scope: '' });
  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [poNumber, setPoNumber] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const loadSchemas = async () => {
      const industry = await window.schemas.getIndustry();
      const product = await window.schemas.getProduct();
      const control = await window.schemas.getControl();
      const scope = await window.schemas.getScope();
      
      setSchemas({ industry, product, control, scope });
    };
    
    const loadCustomers = async () => {
      const data = await window.customers.getAll();
      setCustomers(data);
    };
    
    loadSchemas();
    loadCustomers();
  }, []);

  const handleCodeChange = (part, value) => {
    setCodes(prev => ({ ...prev, [part]: value }));
  };

  const handleGenerateNumber = async () => {
    try {
      if (mode === 'quote') {
        const data = { customerCode: customer, ...codes };
        const result = await window.calc.getQuoteNumber(data);
        setGeneratedNumber(result.fullId);
        
        // Log to frontend logging service
        const selectedCustomer = customers.find(c => c.id === customer);
        loggingService.logQuoteActivity(
          'generate_number',
          result.fullId,
          'New Quote',
          selectedCustomer?.name || 'Unknown',
          'draft',
          {
            mainId: result.mainId,
            industry: codes.industry,
            product: codes.product,
            control: codes.control,
            scope: codes.scope,
            source: 'number_generator'
          }
        );
      } else {
        // Project number generation
        if (!window.calc.getProjectNumber) {
          console.error('Project number function not available. Please restart the app.');
          alert('Project number generation is not available. Please restart the application.');
          return;
        }
        const data = { customerCode: customer, poNumber, ...codes };
        const result = await window.calc.getProjectNumber(data);
        setGeneratedNumber(result.fullId);
        
        // Log to frontend logging service
        const selectedCustomer = customers.find(c => c.id === customer);
        loggingService.logProjectActivity(
          'generate_number',
          result.fullId,
          'New Project',
          selectedCustomer?.name || 'Unknown',
          'draft',
          {
            mainId: result.mainId,
            industry: codes.industry,
            product: codes.product,
            control: codes.control,
            scope: codes.scope,
            poNumber: poNumber,
            source: 'number_generator'
          }
        );
      }
      setHasCopied(false);
    } catch (error) {
      console.error('Error generating number:', error);
      alert('Error generating number: ' + error.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNumber).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  const isFormValid = () => {
    if (mode === 'quote') {
      return customer && codes.industry && codes.product && codes.control && codes.scope;
    } else {
      // Project number requires PO# and other fields
      return customer && poNumber && codes.industry && codes.product && codes.control && codes.scope && poNumber.length === 4 && /^\d{4}$/.test(poNumber);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Number Generator</h1>
      
      {/* Mode Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setMode('quote')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            mode === 'quote' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Quote Number
        </button>
        <button
          onClick={() => setMode('project')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            mode === 'project' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Project Number
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <SelectCustomer value={customer} onChange={e => setCustomer(e.target.value)} />
        
        {mode === 'project' && (
          <div>
            <label className="block text-sm font-medium text-gray-400">
              PO Number (4 digits) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g., 1234"
              maxLength="4"
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
            />
            {poNumber && poNumber.length !== 4 && (
              <p className="text-xs text-orange-400 mt-1">PO number must be exactly 4 digits</p>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <SelectCode label="Industry" code={codes.industry} options={schemas.industry} onCodeChange={val => handleCodeChange('industry', val)} />
          <SelectCode label="Product" code={codes.product} options={schemas.product} onCodeChange={val => handleCodeChange('product', val)} />
          <SelectCode label="Control" code={codes.control} options={schemas.control} onCodeChange={val => handleCodeChange('control', val)} />
          <SelectCode label="Scope" code={codes.scope} options={schemas.scope} onCodeChange={val => handleCodeChange('scope', val)} />
        </div>
        <button
          onClick={handleGenerateNumber}
          disabled={!isFormValid()}
          className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${
            isFormValid()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Generate {mode === 'quote' ? 'Quote' : 'Project'} Number
        </button>

        {generatedNumber && (
          <div className="pt-4">
            <label className="block text-sm font-medium text-slateish/60">
              Generated {mode === 'quote' ? 'Quote' : 'Project'} Number:
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                readOnly 
                value={generatedNumber} 
                className={`w-full bg-slateish/5 border border-slateish/30 rounded-md p-3 text-lg font-mono ${
                  mode === 'quote' ? 'text-accent' : 'text-success'
                }`}
              />
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 px-4 py-3 rounded-md ${hasCopied ? 'ca-btn-success' : 'ca-btn-secondary'} text-white`}
              >
                {hasCopied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <div className="mt-3 p-3 bg-info/10 border border-info/30 rounded-lg flex items-start gap-2">
              <FileText size={16} className="text-info mt-0.5 flex-shrink-0" />
              <p className="text-xs text-info">
                <strong>Logged to OUTPUT/LOGS/{mode === 'quote' ? 'QuoteNumbers' : 'ProjectNumbers'}.csv</strong>
                <br />
                All generated numbers are automatically tracked with timestamp, customer, and schema details.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
