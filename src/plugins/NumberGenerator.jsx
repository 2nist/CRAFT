import React, { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

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
      <label className="block text-sm font-medium text-gray-400">Customer</label>
      <select 
        value={value} 
        onChange={onChange}
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
      >
        <option value="">Select Customer...</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
      </select>
    </div>
  );
};

export default function NumberGenerator({ context }) {
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [codes, setCodes] = useState({ industry: '', product: '', control: '', scope: '' });
  const [customer, setCustomer] = useState('');
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
    loadSchemas();
  }, []);

  const handleCodeChange = (part, value) => {
    setCodes(prev => ({ ...prev, [part]: value }));
  };

  const handleGenerateNumber = async () => {
    const data = { customerCode: customer, ...codes };
    const result = await window.calc.getQuoteNumber(data);
    setGeneratedNumber(result.fullId);
    setHasCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNumber).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Quote Number Generator</h1>
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <SelectCustomer value={customer} onChange={e => setCustomer(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <SelectCode label="Industry" code={codes.industry} options={schemas.industry} onCodeChange={val => handleCodeChange('industry', val)} />
          <SelectCode label="Product" code={codes.product} options={schemas.product} onCodeChange={val => handleCodeChange('product', val)} />
          <SelectCode label="Control" code={codes.control} options={schemas.control} onCodeChange={val => handleCodeChange('control', val)} />
          <SelectCode label="Scope" code={codes.scope} options={schemas.scope} onCodeChange={val => handleCodeChange('scope', val)} />
        </div>
        <button
          onClick={handleGenerateNumber}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Number
        </button>

        {generatedNumber && (
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-400">Generated Quote Number:</label>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                readOnly 
                value={generatedNumber} 
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-lg text-green-400 font-mono"
              />
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 px-4 py-3 rounded-md ${hasCopied ? 'bg-green-600' : 'bg-gray-600'} text-white`}
              >
                {hasCopied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
