import React, { useState, useEffect } from 'react';

export default function MarginCalculator({ context }) {
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('25');
  const [markup, setMarkup] = useState('');
  const [price, setPrice] = useState('');
  const [profit, setProfit] = useState('');

  useEffect(() => {
    const c = parseFloat(cost);
    const m = parseFloat(margin);

    if (!isNaN(c) && !isNaN(m) && m !== 100) {
      const newPrice = c / (1 - (m / 100));
      const newProfit = newPrice - c;
      const newMarkup = (newProfit / c) * 100;
      
      setPrice(newPrice.toFixed(2));
      setProfit(newProfit.toFixed(2));
      if (isFinite(newMarkup)) {
        setMarkup(newMarkup.toFixed(2));
      } else {
        setMarkup('');
      }
    } else {
      setPrice('');
      setProfit('');
      setMarkup('');
    }
  }, [cost, margin]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Margin & Price Calculator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="p-6 bg-gray-900 rounded-lg shadow-lg space-y-6">
          <h2 className="text-xl font-semibold text-white">Inputs</h2>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Total Cost</label>
            <input
              type="number"
              placeholder="1000.00"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Target Margin (%)</label>
            <input
              type="number"
              placeholder="25"
              value={margin}
              onChange={e => setMargin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
            />
          </div>
        </div>

        {/* Results */}
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg space-y-5">
          <h2 className="text-xl font-semibold text-white">Results</h2>
          <div className="p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">Final Sale Price</p>
            <p className="text-2xl font-semibold text-green-400">
              {price ? `$${parseFloat(price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'}
            </p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">Profit</p>
            <p className="text-2xl font-semibold text-white">
              {profit ? `$${parseFloat(profit).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Margin</p>
              <p className="text-xl font-semibold text-white">
                {margin ? `${parseFloat(margin).toFixed(2)}%` : '0.00%'}
              </p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Markup</p>
              <p className="text-xl font-semibold text-white">
                {markup ? `${parseFloat(markup).toFixed(2)}%` : '0.00%'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
