import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuoteConfiguratorData } from '@/hooks/useQuoteConfiguratorData';

// Create the context
const QuoteConfiguratorContext = createContext(null);

// Provider component
export function QuoteConfiguratorProvider({ children }) {
  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // Quote State
  const [quote, setQuote] = useState({
    id: null,
    quoteId: '',
    customer: '',
    projectName: '',
    salesRep: '',
    status: 'Draft',
    projectCodes: {
      industry: null,
      product: null,
      control: null,
      scope: null
    },
    controlPanelConfig: {
      voltage: '',
      phase: '',
      enclosureType: '',
      enclosureRating: '',
      hmiSize: '',
      plcPlatform: ''
    },
    productConfiguration: {},
    bom: []
  });

  // Template and Assembly State
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [selectedAssemblies, setSelectedAssemblies] = useState([]);
  const [assemblyQuantities, setAssemblyQuantities] = useState({});
  const [assemblyNotes, setAssemblyNotes] = useState({});
  const [operationalItems, setOperationalItems] = useState([]);

  // Loading and Message State
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState('');

  // Data loading hook
  const {
    schemas,
    customers,
    panelOptions,
    defaultIOFields,
    isLoading: isDataLoading,
    error: dataError,
    reloadData
  } = useQuoteConfiguratorData();

  // Constants
  const DESKTOP_BREAKPOINT = '(min-width: 1280px)';
  const LEFT_DRAWER_HANDLE_WIDTH = 28;
  const LEFT_DRAWER_WIDTH = 360;
  const LEFT_DRAWER_OFFSETS = { top: 65, left: 150, bottomGap: 0 };
  const RIGHT_DRAWER_HANDLE_WIDTH = 20;
  const RIGHT_DRAWER_WIDTH = 352;
  const RIGHT_DRAWER_OFFSETS = { top: 65, right: 24, bottomGap: 0 };

  // Steps configuration
  const steps = useMemo(() => [
    { id: 1, title: 'Product Config', description: 'Configure motors, I/O, and assemblies unique to this product.' },
    { id: 2, title: 'BOM Assistance', description: 'Assemble the bill of materials and generate consolidated outputs.' }
  ], []);

  // Computed values
  const activeStep = steps.find(step => step.id === currentStep) || steps[0];
  const nextStep = steps[currentStep] ? steps[currentStep].title : null;
  const nextLabel = currentStep === steps.length
    ? (isLoading ? 'Saving…' : 'Save & Finish')
    : `Continue${nextStep ? ` · ${nextStep}` : ''}`;
  const upcomingStep = steps.find(step => step.id === currentStep + 1) || null;

  const displayQuoteNumber = quote.quoteId || generatedNumber || '';
  const selectedCustomer = useMemo(() => {
    if (!Array.isArray(customers)) {
      return null;
    }
    return customers.find(customer => customer.id === quote.customer) || null;
  }, [customers, quote.customer]);

  const operationalCount = Array.isArray(operationalItems) ? operationalItems.length : 0;
  const selectedAssemblyCount = Array.isArray(selectedAssemblies) ? selectedAssemblies.length : 0;

  // Responsive breakpoint handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(DESKTOP_BREAKPOINT);

    const applyBreakpointState = (target) => {
      const matches = target.matches;
      setIsDesktop(matches);
      if (matches) {
        setIsLeftDrawerOpen(true);
        setIsRightDrawerOpen(true);
      } else {
        setIsLeftDrawerOpen(false);
        setIsRightDrawerOpen(false);
      }
    };

    applyBreakpointState(media);
    const handleChange = (event) => applyBreakpointState(event);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Sync selectedAssemblies to quote.bom with full details
  useEffect(() => {
    const buildBomWithDetails = async () => {
      if (selectedAssemblies.length === 0) {
        setQuote(prev => ({ ...prev, bom: [] }));
        return;
      }

      try {
        // Get unique assembly IDs
        const uniqueIds = [...new Set(selectedAssemblies)];

        // Build BOM with assembly details, quantities, and notes
        const bomWithDetails = uniqueIds.map(id => ({
          assemblyId: id,
          quantity: assemblyQuantities[id] || 1,
          notes: assemblyNotes[id] || ''
        }));

        setQuote(prev => ({
          ...prev,
          bom: bomWithDetails
        }));
      } catch (error) {
        console.error('Error building BOM:', error);
      }
    };

    buildBomWithDetails();
  }, [selectedAssemblies, assemblyQuantities, assemblyNotes]);

  // Load product template when product code changes
  useEffect(() => {
    const loadTemplate = async () => {
      const productCode = quote.projectCodes.product;

      if (!productCode) {
        setCurrentTemplate(null);
        setQuote(prev => ({
          ...prev,
          productConfiguration: {}
        }));
        return;
      }

      try {
        const template = await window.productTemplates.get(productCode);

        if (template) {
          // Debug: Log template structure
          console.log('[Template Load] Template loaded:', {
            productCode: productCode,
            hasAssemblies: !!template.assemblies,
            assembliesIsArray: Array.isArray(template.assemblies),
            assembliesType: typeof template.assemblies,
            assembliesCount: Array.isArray(template.assemblies) ? template.assemblies.length : 'N/A'
          });

          // Ensure template has v2.0 structure (assemblies as array)
          // If template uses old structure, convert it or warn
          if (template.assemblies && !Array.isArray(template.assemblies)) {
            console.warn(`[Template Load] Template ${productCode} uses old structure. Expected assemblies to be an array. Template may not work correctly with v2.0 features.`);
            console.warn('[Template Load] The migration service should have converted this. Check IPC handler.');
          }

          setCurrentTemplate(template);

          // Initialize productConfiguration with ALL data from template
          // Note: v2.0 uses instance-based structure, so we don't set assemblies here
          setQuote(prev => ({
            ...prev,
            productConfiguration: {
              ...prev.productConfiguration,
              engineeringHours: template.estimatedBaseLaborHours || template.engineeringHours || 0,
              programmingHours: template.programmingHours || 0,
              productionHours: template.productionHours || 0
              // v2.0: assemblies and fields are handled per-instance in ProductConfigurationForm
              // Don't set old-style fields or assemblies here
            }
          }));
        } else {
          // No template found - use default I/O fields
          // v2.0: Create template with empty assemblies array
          setCurrentTemplate({
            productCode: productCode,
            productName: 'New Template (Unsaved)',
            assemblies: [], // v2.0: empty array, not object
            estimatedBaseLaborHours: 0,
            engineeringHours: 0,
            programmingHours: 0,
            productionHours: 0
          });

          setQuote(prev => ({
            ...prev,
            productConfiguration: {
              engineeringHours: 0,
              programmingHours: 0,
              productionHours: 0
            }
          }));
        }
      } catch (error) {
        console.error('Error loading template:', error);
        setCurrentTemplate(null);
      }
    };

    loadTemplate();
  }, [quote.projectCodes.product]);

  // Handler functions
  const updateProductConfiguration = useCallback((configOrUpdater) => {
    setQuote(prev => ({
      ...prev,
      productConfiguration: typeof configOrUpdater === 'function'
        ? configOrUpdater(prev.productConfiguration)
        : configOrUpdater
    }));
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setQuote(prev => ({
      ...prev,
      [field]: typeof value === 'function' ? value(prev[field]) : value
    }));
  }, []);

  const handleCodeChange = useCallback((field, value) => {
    setQuote(prev => ({
      ...prev,
      projectCodes: { ...prev.projectCodes, [field]: value }
    }));
  }, []);

  const handlePanelFieldChange = useCallback((field, value) => {
    setQuote(prev => ({
      ...prev,
      controlPanelConfig: {
        ...prev.controlPanelConfig,
        [field]: value
      }
    }));
  }, []);

  const generateQuoteId = useCallback(async () => {
    const data = {
      customerCode: quote.customer,
      ...quote.projectCodes
    };

    const result = await window.calc.getQuoteNumber(data);
    setGeneratedNumber(result.fullId);
    setQuote(prev => ({ ...prev, quoteId: result.fullId }));
  }, [quote.customer, quote.projectCodes]);

  const handleNext = useCallback(async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === steps.length) {
      // On last step, save and finish
      await handleSave();
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleGoToStep = useCallback((targetStep) => {
    if (typeof targetStep !== 'number' || targetStep < 1 || targetStep > steps.length) {
      return;
    }
    setCurrentStep(targetStep);
  }, [steps.length]);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    try {
      // --- Validate quote before save ---
      console.log('Validating quote before save...');
      const validationResult = await window.quotes.validate(quote);

      if (validationResult.success && validationResult.validationErrors.length > 0) {
        const errors = validationResult.validationErrors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
          console.error('Validation failed!', errors);
          const errorMessages = errors.map(e => `• ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`).join('\n');
          alert(`Cannot save quote. Please fix the following errors:\n\n${errorMessages}`);
          setMessage('Validation failed. Please fix errors before saving.');
          return; // Stop the save
        }
      } else if (!validationResult.success) {
        console.error('Validation service failed:', validationResult.error);
        alert(`Error during validation: ${validationResult.error}`);
        setMessage('Validation service error. Please try again.');
        return; // Stop the save
      }

      console.log('Validation passed. Proceeding with save...');

      // --- Calculate pricing from operationalItems ---
      const materialCost = operationalItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

      // Get labor hours from productConfiguration or template
      const laborHours = {
        engineering: quote.productConfiguration?.engineeringHours || currentTemplate?.engineeringHours || 0,
        production: quote.productConfiguration?.productionHours || currentTemplate?.productionHours || 0,
        programming: quote.productConfiguration?.programmingHours || currentTemplate?.programmingHours || 0
      };

      // Calculate labor cost
      const laborCost = (
        (laborHours.engineering || 0) * 60 +
        (laborHours.production || 0) * 35 +
        (laborHours.programming || 0) * 85
      );

      const totalCOGS = materialCost + laborCost;

      // Calculate final price (if margin is set, otherwise use COGS)
      // For now, we'll just set finalPrice to COGS if no margin is configured
      const marginPercent = quote.pricing?.marginPercent || 0;
      const finalPrice = marginPercent > 0
        ? totalCOGS / (1 - (marginPercent / 100))
        : totalCOGS;

      // --- Update quote object with new data ---
      const updatedQuote = {
        ...quote,
        operationalItems: operationalItems,
        pricing: {
          materialCost: materialCost,
          laborCost: laborCost,
          totalCOGS: totalCOGS,
          finalPrice: finalPrice,
          marginPercent: marginPercent
        },
        validationErrors: validationResult.validationErrors || [],
        // Pipedrive fields (already in schema, ensure they're present)
        pipedrive_deal_id: quote.pipedrive_deal_id || null,
        pipedrive_person_id: quote.pipedrive_person_id || null,
        historical_margin_avg: quote.historical_margin_avg || null
      };

      // Save the updated quote
      await window.quotes.save(updatedQuote);

      // Update local quote state
      setQuote(updatedQuote);

      setMessage('Quote saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      setMessage('Failed to save quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [quote, operationalItems, currentTemplate]);

  const handleLoadQuote = useCallback(async () => {
    const quoteId = window.prompt('Enter a Quote ID to load');
    if (!quoteId) return;

    const trimmedId = quoteId.trim();
    if (!trimmedId) return;

    setIsLoading(true);
    setMessage('');
    try {
      const loadedQuote = await window.quotes.getById(trimmedId);

      if (!loadedQuote) {
        alert(`Quote "${trimmedId}" was not found.`);
        return;
      }

      const normalizedQuote = {
        ...quote,
        ...loadedQuote,
        projectCodes: {
          ...quote.projectCodes,
          ...(loadedQuote.projectCodes || {})
        },
        controlPanelConfig: {
          ...quote.controlPanelConfig,
          ...(loadedQuote.controlPanelConfig || {})
        },
        productConfiguration: {
          ...quote.productConfiguration,
          ...(loadedQuote.productConfiguration || {})
        },
        bom: loadedQuote.bom || []
      };

      const bomList = normalizedQuote.bom || [];

      setQuote(normalizedQuote);
      setGeneratedNumber(normalizedQuote.quoteId || '');
      setSelectedAssemblies(bomList.map(item => item.assemblyId).filter(Boolean));
      setAssemblyQuantities(bomList.reduce((acc, item) => {
        if (item.assemblyId) {
          acc[item.assemblyId] = item.quantity || 1;
        }
        return acc;
      }, {}));
      setAssemblyNotes(bomList.reduce((acc, item) => {
        if (item.assemblyId && item.notes) {
          acc[item.assemblyId] = item.notes;
        }
        return acc;
      }, {}));
      setOperationalItems(loadedQuote.operationalItems || []);
      setCurrentStep(1);
      setMessage('Quote loaded successfully!');
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load quote. Please verify the ID and try again.');
      setMessage('Failed to load quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [quote]);

  // Assembly management handlers
  const handleAddAssembly = useCallback((assemblyId) => {
    // Always add assembly, even if already selected (allows duplicates for motors, heaters, etc.)
    setSelectedAssemblies(prev => [...prev, assemblyId]);
    setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: (prev[assemblyId] || 0) + 1 }));
  }, []);

  const handleRemoveAssembly = useCallback((assemblyId) => {
    const currentQty = assemblyQuantities[assemblyId] || 1;

    if (currentQty > 1) {
      // Decrement quantity
      setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: currentQty - 1 }));
    } else {
      // Remove completely if quantity is 1
      setSelectedAssemblies(prev => prev.filter(id => id !== assemblyId));
      setAssemblyQuantities(prev => {
        const newQty = { ...prev };
        delete newQty[assemblyId];
        return newQty;
      });
      setAssemblyNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[assemblyId];
        return newNotes;
      });
    }
  }, [assemblyQuantities]);

  const handleQuantityChange = useCallback((assemblyId, quantity) => {
    const qty = parseInt(quantity) || 1;
    setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: qty }));
  }, []);

  const handleNoteChange = useCallback((assemblyId, note) => {
    setAssemblyNotes(prev => ({ ...prev, [assemblyId]: note }));
  }, []);

  // Drawer handlers
  const handleToggleLeftDrawer = useCallback(() => {
    setIsLeftDrawerOpen(prev => !prev);
  }, []);

  const handleToggleRightDrawer = useCallback(() => {
    setIsRightDrawerOpen(prev => !prev);
  }, []);

  // Styles
  const leftDrawerStyles = useMemo(() => isDesktop
    ? {
        top: LEFT_DRAWER_OFFSETS.top,
        left: LEFT_DRAWER_OFFSETS.left,
        bottom: LEFT_DRAWER_OFFSETS.bottomGap,
        width: isLeftDrawerOpen ? `${LEFT_DRAWER_WIDTH}px` : `${LEFT_DRAWER_HANDLE_WIDTH}px`,
        transition: 'width 0.3s ease'
      }
    : {
        top: 0,
        left: 0,
        bottom: 0,
        width: 'min(22rem, calc(100vw - 24px))',
        transform: isLeftDrawerOpen ? 'translateX(0)' : 'translateX(-100%)'
      }, [isDesktop, isLeftDrawerOpen]);

  const rightDrawerStyles = useMemo(() => isDesktop
    ? {
        top: RIGHT_DRAWER_OFFSETS.top,
        right: RIGHT_DRAWER_OFFSETS.right,
        bottom: RIGHT_DRAWER_OFFSETS.bottomGap,
        width: isRightDrawerOpen ? `${RIGHT_DRAWER_WIDTH}px` : `${RIGHT_DRAWER_HANDLE_WIDTH}px`,
        transition: 'width 0.3s ease',
        pointerEvents: 'auto'
      }
    : {
        top: 0,
        right: 0,
        bottom: 0,
        width: `min(${RIGHT_DRAWER_WIDTH}px, calc(100vw - 24px))`,
        transform: isRightDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        pointerEvents: isRightDrawerOpen ? 'auto' : 'none'
      }, [isDesktop, isRightDrawerOpen]);

  const mainContentStyle = useMemo(() => ({
    paddingLeft: isDesktop ? LEFT_DRAWER_HANDLE_WIDTH + 8 : 16,
    paddingRight: isDesktop ? 24 : 16
  }), [isDesktop]);

  // Context value
  const contextValue = {
    // State
    currentStep,
    quote,
    currentTemplate,
    selectedAssemblies,
    assemblyQuantities,
    assemblyNotes,
    operationalItems,
    isLoading,
    message,
    generatedNumber,
    schemas,
    customers,
    panelOptions,
    defaultIOFields,
    isLeftDrawerOpen,
    isRightDrawerOpen,
    isDesktop,
    isDataLoading,
    dataError,

    // Computed values
    steps,
    activeStep,
    nextLabel,
    upcomingStep,
    displayQuoteNumber,
    selectedCustomer,
    operationalCount,
    selectedAssemblyCount,

    // Styles
    leftDrawerStyles,
    rightDrawerStyles,
    mainContentStyle,

    // Handlers
    setQuote,
    updateProductConfiguration,
    handleFieldChange,
    handleCodeChange,
    handlePanelFieldChange,
    generateQuoteId,
    handleNext,
    handlePrev,
    handleGoToStep,
    handleSave,
    handleLoadQuote,
    handleAddAssembly,
    handleRemoveAssembly,
    handleQuantityChange,
    handleNoteChange,
    handleToggleLeftDrawer,
    handleToggleRightDrawer,
    reloadData
  };

  return (
    <QuoteConfiguratorContext.Provider value={contextValue}>
      {children}
    </QuoteConfiguratorContext.Provider>
  );
}

// Hook to use the context
export function useQuoteConfigurator() {
  const context = useContext(QuoteConfiguratorContext);
  if (!context) {
    throw new Error('useQuoteConfigurator must be used within a QuoteConfiguratorProvider');
  }
  return context;
}