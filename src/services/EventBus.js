/**
 * EventBus - Simple pub/sub pattern for global component communication
 * Singleton instance for app-wide event handling
 */

class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function to execute when event fires
   * @returns {function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event with data
   * @param {string} event - Event name
   * @param {*} data - Data to pass to subscribers
   */
  publish(event, data) {
    if (!this.events[event]) {
      return;
    }
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Clear all subscribers for an event
   * @param {string} event - Event name
   */
  clearEvent(event) {
    delete this.events[event];
  }

  /**
   * Clear all events
   */
  clearAll() {
    this.events = {};
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Event name constants for consistency
export const EVENTS = {
  COMPONENT_SELECTED: 'GLOBAL_COMPONENT_SELECTED',
  SEARCH_OPENED: 'GLOBAL_SEARCH_OPENED',
  SEARCH_CLOSED: 'GLOBAL_SEARCH_CLOSED'
};

export default eventBus;
