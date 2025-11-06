/**
 * SearchService - Centralized component search logic
 * Handles searching across all components by SKU, Description, Category, etc.
 */

class SearchService {
  constructor() {
    this.components = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the search service with component data
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.components = await window.components.getAll();
      console.log('[SearchService] Loaded components:', this.components.length);
      console.log('[SearchService] Sample component:', this.components[0]);
      console.log('[SearchService] Component fields:', this.components[0] ? Object.keys(this.components[0]) : 'No components');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load components:', error);
      this.components = [];
    }
  }

  /**
   * Refresh component data
   */
  async refresh() {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Search components by query string
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Filtered components
   */
  search(query, options = {}) {
    if (!query || query.trim() === '') {
      // Return all components or a limited set when no query
      const limit = options.limit || 50;
      return this.components.slice(0, limit);
    }

    const searchTerm = query.toLowerCase().trim();
    const {
      limit = 100,
      searchFields = ['sku', 'description', 'category', 'manufacturer', 'vendor', 'partAbbrev']
    } = options;

    console.log('[SearchService] Searching for:', searchTerm, 'in fields:', searchFields);

    const results = this.components.filter(component => {
      return searchFields.some(field => {
        const value = component[field];
        if (!value) return false;
        const match = value.toString().toLowerCase().includes(searchTerm);
        if (match && searchFields.indexOf(field) === 0) { // Log first field matches
          console.log('[SearchService] Match found:', field, '=', value);
        }
        return match;
      });
    });

    console.log('[SearchService] Found', results.length, 'results');
    return results.slice(0, limit);
  }

  /**
   * Get component by SKU
   * @param {string} sku - Component SKU
   * @returns {Object|null} Component or null
   */
  getBySku(sku) {
    return this.components.find(c => c.sku === sku) || null;
  }

  /**
   * Get all categories
   * @returns {Array} Unique categories
   */
  getCategories() {
    const categories = new Set();
    this.components.forEach(c => {
      if (c.category) {
        categories.add(c.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Search by category
   * @param {string} category - Category name
   * @param {number} limit - Result limit
   * @returns {Array} Components in category
   */
  searchByCategory(category, limit = 100) {
    return this.components
      .filter(c => c.category === category)
      .slice(0, limit);
  }

  /**
   * Get total component count
   * @returns {number} Total components
   */
  getTotalCount() {
    return this.components.length;
  }
}

// Export singleton instance
export const searchService = new SearchService();

export default searchService;
