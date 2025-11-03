import React, { useState, useEffect } from 'react';

const NEC_430_250_3PH = {
  "208V": { 0.5: 2.2, 0.75: 3.1, 1: 4.0, 1.5: 5.9, 2: 7.5, 3: 10.6, 5: 17.5, 7.5: 26, 10: 34, 15: 50, 20: 65 },
  "230V": { 0.5: 2.0, 0.75: 2.8, 1: 3.6, 1.5: 5.2, 2: 6.8, 3: 9.6, 5: 15.2, 7.5: 22, 10: 28, 15: 42, 20: 54 },
  "460V": { 0.5: 1.0, 0.75: 1.4, 1: 1.8, 1.5: 2.6, 2: 3.4, 3: 4.8, 5: 7.6, 7.5: 11, 10: 14, 15: 21, 20: 27 },
  "575V": { 0.5: 0.8, 0.75: 1.1, 1: 1.4, 1.5: 2.1, 2: 2.7, 3: 3.9, 5: 6.1, 7.5: 9.0, 10: 11, 15: 17, 20: 22 }
};

function MotorFLACalculator() {
  const [hp, setHp] = useState('1');
  const [voltage, setVoltage] = useState('460V');
  const [phase, setPhase] = useState('3-Phase');
  const [fla, setFla] = useState(null);

  const calculateFLA = () => {
    const hpNum = parseFloat(hp);
    if (isNaN(hpNum)) {
      setFla(NaN);
      return;
    }

    const table = NEC_430_250_3PH[voltage];
    if (table && table[hpNum]) {
      setFla(table[hpNum]);
    } else {
      const efficiency = 0.85;
      const powerFactor = 0.8;
      const watts = hpNum * 745.7;
      const voltNum = parseInt(voltage);
      const calculatedFla = watts / (voltNum * Math.sqrt(3) * efficiency * powerFactor);
      setFla(calculatedFla);
    }
  };

  useEffect(calculateFLA, [hp, voltage, phase]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Motor FLA Calculator</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Phase</label>
          <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white">
            <option value="3-Phase">3-Phase</option>
            <option value="1-Phase">1-Phase</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Voltage</label>
          <select value={voltage} onChange={e => setVoltage(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white">
            <option value="208V">208V</option>
            <option value="230V">230V</option>
            <option value="460V">460V</option>
            <option value="575V">575V</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Horsepower (HP)</label>
          <input type="number" value={hp} onChange={e => setHp(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
        </div>
      </div>
      {fla !== null && !isNaN(fla) && (
        <div className="mt-6 p-6 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Calculated FLA</p>
          <p className="text-4xl font-bold text-green-400">{fla.toFixed(2)} A</p>
        </div>
      )}
    </div>
  );
}

export default function FlaCalculator({ context }) {
  const [activeTab, setActiveTab] = useState('motor');

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">FLA Calculator</h1>
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('motor')}
          className={`px-4 py-2 ${activeTab === 'motor' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Motor FLA
        </button>
        <button
          onClick={() => setActiveTab('heater')}
          className={`px-4 py-2 ${activeTab === 'heater' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Heater FLA
        </button>
      </div>
      <div className="bg-gray-900 rounded-lg shadow-lg">
        {activeTab === 'motor' && <MotorFLACalculator />}
        {activeTab === 'heater' && <div className="p-4 text-gray-400">Heater calculator (simplified)</div>}
      </div>
    </div>
  );
}
