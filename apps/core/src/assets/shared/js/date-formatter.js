// shared/js/date-formatter.js

window.DateFormatter = {
  /**
   * Formats a date string or Date object into 'yyyy-mm-dd'.
   * @param {string | Date} dateInput - The date to format.
   * @returns {string} The formatted date string or 'Never' if invalid.
   */
  formatDateToYMD(dateInput) {
    if (!dateInput || dateInput === 'Never') return 'Never';

    try {
      const date = new Date(dateInput);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try to parse strings that might not be directly supported
        const parsed = Date.parse(dateInput);
        if(isNaN(parsed)) return 'Never';
        const parsedDate = new Date(parsed);
        if (isNaN(parsedDate.getTime())) return 'Never';
        return this.formatDateToYMD(parsedDate);
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Never';
    }
  },

  /**
   * Formats a date string or Date object for display.
   * Can be extended with more formats later.
   * @param {string | Date} dateInput - The date to format.
   * @param {string} format - The desired format ('yyyy-mm-dd', etc.).
   * @returns {string} The formatted date string.
   */
  format(dateInput, format = 'yyyy-mm-dd') {
    switch (format) {
      case 'yyyy-mm-dd':
        return this.formatDateToYMD(dateInput);
      // Add other formats here if needed in the future
      // case 'mm/dd/yyyy':
      //   ...
      default:
        return this.formatDateToYMD(dateInput);
    }
  }
};