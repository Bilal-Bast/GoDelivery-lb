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
 
  showSuccess(message) {
    this.input.classList.remove("invalid");
    this.input.classList.add("valid");

    this.errorContainer.style.display = "none";

    this.successContainer.style.display = "flex";
    const textElement = this.successContainer.querySelector(".text");
    if (textElement) textElement.textContent = message;
  }
 
  showError(message) {
    this.input.classList.remove("valid");
    this.input.classList.add("invalid");

    this.successContainer.style.display = "none";

    this.errorContainer.style.display = "flex";
    const textElement = this.errorContainer.querySelector(".text");
    if (textElement) textElement.textContent = message;
  }
 
  showLoading() {
    this.clearMessages();

    this.input.classList.remove("valid", "invalid");

    this.errorContainer.style.display = "flex";
    const iconElement = this.errorContainer.querySelector(".icon");
    const textElement = this.errorContainer.querySelector(".text");
    
    if (iconElement) iconElement.textContent = "⏳";
    if (textElement) textElement.textContent = "Checking...";
    this.errorContainer.style.color = "#666";
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
    this.input.classList.remove("valid", "invalid");

    document.getElementById("orderIDError").style.display = "none";
    document.getElementById("orderIDSuccess").style.display = "none";
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