class OrderIDValidator {
  constructor(inputSelector, errorSelector, successSelector, submitButtonSelector) {
    this.input = document.querySelector(inputSelector);
    this.errorContainer = document.querySelector(errorSelector);
    this.successContainer = document.querySelector(successSelector);
    this.submitButton = document.querySelector(submitButtonSelector);
    this.debounceTimer = null;
    this.debounceDelay = 500; // milliseconds
 
    this.init();
  }
 
  init() {
    if (!this.input) {
      console.error('Order ID input element not found');
      return;
    }
 
    // Add event listener with debouncing
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('blur', () => this.validate());
  }
 
  handleInput() {
    // Clear previous timer
    clearTimeout(this.debounceTimer);
 
    // Only validate if input has a value
    if (this.input.value.trim() === '') {
      this.resetValidation();
      return;
    }
 
    // Debounce the validation request
    this.debounceTimer = setTimeout(() => {
      this.validate();
    }, this.debounceDelay);
  }
 
  async validate() {
    const orderID = this.input.value.trim();
 
    if (!orderID) {
      this.resetValidation();
      return;
    }
 
    // Show loading state
    this.showLoading();
 
    try {
      // Send request to your backend API
      const response = await fetch('/api/orders/validate-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderID }),
      });
 
      const data = await response.json();
 
      if (data.exists) {
        this.showError(`Order ID "${orderID}" is already in use`);
      } else {
        this.showSuccess(`Order ID "${orderID}" is available`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      this.showError('Unable to validate Order ID. Please try again.');
    }
  }
 
  showError(message) {
    this.clearMessages();
    this.input.classList.add('is-invalid');
    this.input.classList.remove('is-valid');
    
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    }
 
    this.disableSubmit();
  }
 
  showSuccess(message) {
    this.clearMessages();
    this.input.classList.add('is-valid');
    this.input.classList.remove('is-invalid');
    
    if (this.successContainer) {
      this.successContainer.textContent = message;
      this.successContainer.style.display = 'block';
    }
 
    this.enableSubmit();
  }
 
  showLoading() {
    this.clearMessages();
    this.input.classList.remove('is-valid', 'is-invalid');
    
    if (this.errorContainer) {
      this.errorContainer.textContent = 'Checking...';
      this.errorContainer.style.display = 'block';
      this.errorContainer.style.color = '#666';
    }
  }
 
  clearMessages() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
      this.errorContainer.textContent = '';
    }
    if (this.successContainer) {
      this.successContainer.style.display = 'none';
      this.successContainer.textContent = '';
    }
  }
 
  resetValidation() {
    this.clearMessages();
    this.input.classList.remove('is-valid', 'is-invalid');
    this.disableSubmit();
  }
 
  disableSubmit() {
    if (this.submitButton) {
      this.submitButton.disabled = true;
      this.submitButton.style.opacity = '0.6';
      this.submitButton.style.cursor = 'not-allowed';
    }
  }
 
  enableSubmit() {
    if (this.submitButton) {
      this.submitButton.disabled = false;
      this.submitButton.style.opacity = '1';
      this.submitButton.style.cursor = 'pointer';
    }
  }
}
 
// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderIDValidator;
}
 