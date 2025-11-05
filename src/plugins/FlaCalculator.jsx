import React, { useState, useEffect } from 'react';
import { Zap, Flame, ChevronsRight } from 'lucide-react';

// Re-usable Input
const TextInput = ({ label, value, onChange, placeholder, type = 'number' }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

// Re-usable Select
const Select = ({ label, value, onChange, options }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Re-usable Result Display
const ResultDisplay = ({ fla }) => (
  <div className="mt-4">
    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Calculated FLA</label>
    <div className="mt-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
        {fla !== null ? fla.toFixed(2) : '0.00'}
      </span>
      <span className="ml-2 text-lg text-slate-600 dark:text-slate-300">Amps</span>
    </div>
  </div>
);

// NEC Table 430.248 (Single-Phase)
const necTableSinglePhase = {
  '115V': { '0.5': 9.8, '0.75': 13.8, '1': 16.0, '1.5': 20.0, '2': 24.0, '3': 34.0, '5': 56.0, '7.5': 80.0, '10': 100.0 },
  '200V': { '0.5': 4.9, '0.75': 6.9, '1': 8.0, '1.5': 10.0, '2': 12.0, '3': 17.0, '5': 28.0, '7.5': 40.0, '10': 50.0 },
  '208V': { '0.5': 4.7, '0.75': 6.6, '1': 7.7, '1.5': 9.6, '2': 11.5, '3': 16.3, '5': 26.9, '7.5': 38.4, '10': 48.0 },
  '230V': { '0.5': 4.4, '0.75': 6.2, '1': 7.0, '1.5': 8.7, '2': 10.4, '3': 14.8, '5': 24.4, '7.5': 34.8, '10': 43.5 },
};

// NEC Table 430.250 (Three-Phase)
const necTableThreePhase = {
  '200V': { '0.5': 2.5, '0.75': 3.7, '1': 4.8, '1.5': 6.9, '2': 7.8, '3': 11.0, '5': 17.5, '7.5': 25.3, '10': 32.2, '15': 48.3, '20': 62.1, '25': 78.2, '30': 92.0, '40': 120.0, '50': 150.0, '60': 177.0, '75': 221.0, '100': 285.0, '125': 359.0, '150': 414.0, '200': 552.0 },
  '208V': { '0.5': 2.4, '0.75': 3.5, '1': 4.6, '1.5': 6.6, '2': 7.5, '3': 10.6, '5': 16.7, '7.5': 24.2, '10': 30.8, '15': 46.2, '20': 59.4, '25': 74.8, '30': 88.0, '40': 114.0, '50': 143.0, '60': 169.0, '75': 211.0, '100': 273.0, '125': 343.0, '150': 396.0, '200': 528.0 },
  '230V': { '0.5': 2.2, '0.75': 3.2, '1': 4.2, '1.5': 6.0, '2': 6.8, '3': 9.6, '5': 15.2, '7.5': 22.0, '10': 28.0, '15': 42.0, '20': 54.0, '25': 68.0, '30': 80.0, '40': 104.0, '50': 130.0, '60': 154.0, '75': 192.0, '100': 248.0, '125': 312.0, '150': 360.0, '200': 480.0 },
  '460V': { '0.5': 1.1, '0.75': 1.6, '1': 2.1, '1.5': 3.0, '2': 3.4, '3': 4.8, '5': 7.6, '7.5': 11.0, '10': 14.0, '15': 21.0, '20': 27.0, '25': 34.0, '30': 40.0, '40': 52.0, '50': 65.0, '60': 77.0, '75': 96.0, '100': 124.0, '125': 156.0, '150': 180.0, '200': 240.0 },
  '575V': { '0.5': 0.9, '0.75': 1.3, '1': 1.7, '1.5': 2.4, '2': 2.7, '3': 3.9, '5': 6.1, '7.5': 8.7, '10': 11.0, '15': 17.0, '20': 22.0, '25': 27.0, '30': 32.0, '40': 41.0, '50': 52.0, '60': 62.0, '75': 77.0, '100': 99.0, '125': 125.0, '150': 144.0, '200': 192.0 },
};

const hpOptions = [
  { value: '0.5', label: '0.5 HP' }, { value: '0.75', label: '0.75 HP' },
  { value: '1', label: '1 HP' }, { value: '1.5', label: '1.5 HP' },
  { value: '2', label: '2 HP' }, { value: '3', label: '3 HP' },
  { value: '5', label: '5 HP' }, { value: '7.5', label: '7.5 HP' },
  { value: '10', label: '10 HP' }, { value: '15', label: '15 HP' },
  { value: '20', label: '20 HP' }, { value: '25', label: '25 HP' },
  { value: '30', label: '30 HP' }, { value: '40', label: '40 HP' },
  { value: '50', label: '50 HP' }, { value: '60', label: '60 HP' },
  { value: '75', label: '75 HP' }, { value: '100', label: '100 HP' },
  { value: '125', label: '125 HP' }, { value: '150', label: '150 HP' },
  { value: '200', label: '200 HP' },
];

const voltageOptions1P = [
  { value: '115V', label: '115V' },
  { value: '200V', label: '200V' },
  { value: '208V', label: '208V' },
  { value: '230V', label: '230V' },
];

const voltageOptions3P = [
  { value: '200V', label: '200V' },
  { value: '208V', label: '208V' },
  { value: '230V', label: '230V' },
  { value: '460V', label: '460V (480V)' },
  { value: '575V', label: '575V (600V)' },
];

// ----- Motor Calculator Tab -----
function MotorCalculator() {
  const [phase, setPhase] = useState('3');
  const [voltage, setVoltage] = useState('460V');
  const [hp, setHp] = useState('1');
  const [fla, setFla] = useState(null);

  useEffect(() => {
    const table = phase === '1' ? necTableSinglePhase : necTableThreePhase;
    const voltageOptions = phase === '1' ? voltageOptions1P : voltageOptions3P;

    // Auto-select first valid voltage if current one is not in the new list
    if (!voltageOptions.find(v => v.value === voltage)) {
      setVoltage(voltageOptions[0].value);
    }
    
    // Auto-select first valid HP if current one is not in the new table
    if (!table[voltage] || !table[voltage][hp]) {
      // Don't reset HP if voltage is just changing, only if HP becomes invalid
      if (!Object.values(table).some(v => v[hp])) {
         setHp('1');
      }
    }
    
    // Calculate FLA
    if (table[voltage] && table[voltage][hp]) {
      setFla(table[voltage][hp]);
    } else {
      setFla(null);
    }
  }, [phase, voltage, hp]);

  const currentVoltageOptions = phase === '1' ? voltageOptions1P : voltageOptions3P;
  const currentHpOptions = hpOptions.filter(h => 
    Object.values(phase === '1' ? necTableSinglePhase : necTableThreePhase)
          .some(voltTable => voltTable[h.value])
  );

  return (
    <div className="space-y-4">
      <Select 
        label="Phase" 
        value={phase} 
        onChange={(e) => setPhase(e.target.value)}
        options={[{ value: '1', label: 'Single Phase' }, { value: '3', label: 'Three Phase' }]}
      />
      <Select 
        label="Voltage" 
        value={voltage} 
        onChange={(e) => setVoltage(e.target.value)}
        options={currentVoltageOptions}
      />
      <Select 
        label="Motor Horsepower (HP)" 
        value={hp} 
        onChange={(e) => setHp(e.target.value)}
        options={currentHpOptions}
      />
      <ResultDisplay fla={fla} />
    </div>
  );
}

// ----- Heater Calculator Tab (FIXED) -----
function HeaterCalculator() {
  const [kw, setKw] = useState('');
  const [voltage, setVoltage] = useState('480V');
  const [phase, setPhase] = useState('3');
  const [fla, setFla] = useState(null);

  const heaterVoltageOptions = [
    { value: '120V', label: '120V' },
    { value: '208V', label: '208V' },
    { value: '240V', label: '240V' },
    { value: '480V', label: '480V' },
    { value: '600V', label: '600V' },
  ];

  const heaterPhaseOptions = [
    { value: '1', label: 'Single Phase' },
    { value: '3', label: 'Three Phase' },
  ];

  useEffect(() => {
    const numKw = parseFloat(kw);
    const numVolt = parseFloat(voltage);

    if (numKw > 0 && numVolt > 0) {
      let calculatedFla;
      if (phase === '1') {
        // Single Phase: FLA = (kW * 1000) / V
        calculatedFla = (numKw * 1000) / numVolt;
      } else {
        // Three Phase: FLA = (kW * 1000) / (V * 1.732)
        calculatedFla = (numKw * 1000) / (numVolt * 1.732);
      }
      setFla(calculatedFla);
    } else {
      setFla(null);
    }
  }, [kw, voltage, phase]);

  return (
    <div className="space-y-4">
      <TextInput 
        label="Kilowatts (kW)" 
        value={kw} 
        onChange={(e) => setKw(e.target.value)} 
        placeholder="e.g., 15.5"
      />
      <Select 
        label="Voltage" 
        value={voltage} 
        onChange={(e) => setVoltage(e.target.value)}
        options={heaterVoltageOptions}
      />
      <Select 
        label="Phase" 
        value={phase} 
        onChange={(e) => setPhase(e.target.value)}
        options={heaterPhaseOptions}
      />
      <ResultDisplay fla={fla} />
    </div>
  );
}

// ----- Main Component -----
export default function FlaCalculator() {
  const [activeTab, setActiveTab] = useState('motor');

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">FLA Calculator</h1>
      
      {/* Tabs */}
      <div className="mb-4">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('motor')}
              className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'motor'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Zap className="w-5 h-5 mr-2" /> Motor FLA
            </button>
            <button
              onClick={() => setActiveTab('heater')}
              className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'heater'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Flame className="w-5 h-5 mr-2" /> Heater FLA
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className={activeTab === 'motor' ? '' : 'hidden'}>
          <MotorCalculator />
        </div>
        <div className={activeTab === 'heater' ? '' : 'hidden'}>
          <HeaterCalculator />
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
        Motor calculations based on NEC® Tables 430.248 & 430.250.
        <br />
        Always consult official NEC® guidelines and local codes.
      </div>
    </div>
  );
}
