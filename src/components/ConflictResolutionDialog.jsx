/**
 * ConflictResolutionDialog - Handle sync conflicts with visual comparison
 */

import React, { useState, useEffect } from 'react';
import { syncService } from '../services/SyncService';
import { AlertTriangle, X, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export function ConflictResolutionDialog({ isOpen, onClose }) {
  const [conflicts, setConflicts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen]);

  const loadConflicts = async () => {
    const pendingConflicts = await syncService.getPendingConflicts();
    setConflicts(pendingConflicts);
    setCurrentIndex(0);
  };

  const currentConflict = conflicts[currentIndex];

  const handleResolve = async (resolution) => {
    if (!currentConflict) return;

    setIsResolving(true);
    try {
      await syncService.resolveConflict(currentConflict.id, resolution);
      
      // Remove resolved conflict from list
      const newConflicts = conflicts.filter((_, i) => i !== currentIndex);
      setConflicts(newConflicts);
      
      // If no more conflicts, close dialog
      if (newConflicts.length === 0) {
        onClose();
      } else {
        // Move to next conflict (or stay at current index if it's the last one)
        setCurrentIndex(Math.min(currentIndex, newConflicts.length - 1));
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict: ' + error.message);
    } finally {
      setIsResolving(false);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getDifferentFields = () => {
    if (!currentConflict) return [];
    
    const local = currentConflict.local_data;
    const remote = currentConflict.remote_data;
    const fields = new Set([...Object.keys(local), ...Object.keys(remote)]);
    
    return Array.from(fields).filter(field => {
      return JSON.stringify(local[field]) !== JSON.stringify(remote[field]);
    });
  };

  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-yellow-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Resolve Sync Conflict
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Conflict {currentIndex + 1} of {conflicts.length} - 
                {currentConflict && ` ${currentConflict.entity_type} #${currentConflict.entity_id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conflict Details */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentConflict && (
            <>
              {/* Conflict Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Entity:</strong> {currentConflict.entity_type}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>ID:</strong> {currentConflict.entity_id}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Conflict Type:</strong> {currentConflict.conflict_type}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Detected:</strong> {new Date(currentConflict.created_at).toLocaleString()}
                </p>
              </div>

              {/* Side-by-side Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Local Version */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Local Version (This App)</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {getDifferentFields().map(field => (
                      <div key={field} className="pb-2 border-b border-gray-100 last:border-b-0">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                          {field}
                        </div>
                        <div className="text-sm text-gray-900 font-mono bg-blue-50 p-2 rounded">
                          {formatValue(currentConflict.local_data[field])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remote Version */}
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-100 px-4 py-2 border-b border-green-200">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-900">Remote Version (Server)</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {getDifferentFields().map(field => (
                      <div key={field} className="pb-2 border-b border-gray-100 last:border-b-0">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                          {field}
                        </div>
                        <div className="text-sm text-gray-900 font-mono bg-green-50 p-2 rounded">
                          {formatValue(currentConflict.remote_data[field])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resolution Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleResolve('local')}
                  disabled={isResolving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Keep Local Version (This App)</span>
                </button>

                <button
                  onClick={() => handleResolve('remote')}
                  disabled={isResolving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Keep Remote Version (Server)</span>
                </button>
              </div>

              {/* Navigation */}
              {conflicts.length > 1 && (
                <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                  <button
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span>
                    {currentIndex + 1} / {conflicts.length}
                  </span>
                  <button
                    onClick={() => setCurrentIndex(Math.min(conflicts.length - 1, currentIndex + 1))}
                    disabled={currentIndex === conflicts.length - 1}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;
