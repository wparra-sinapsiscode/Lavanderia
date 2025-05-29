import api from './api';
import { transactionStorage, serviceStorage, hotelStorage } from '../utils/storage';

/**
 * Transaction Service
 * Provides methods for financial transaction management
 */
class TransactionService {
  /**
   * Get all transactions with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.type - Filter by transaction type
   * @param {string} filters.status - Filter by status
   * @param {number} filters.hotelId - Filter by hotel ID
   * @param {number} filters.serviceId - Filter by service ID
   * @param {string} filters.startDate - Filter from start date
   * @param {string} filters.endDate - Filter to end date
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Transactions data
   */
  async getAllTransactions(filters = {}) {
    try {
      const response = await api.get('/transactions', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get transactions error:', error);
      
      // Fallback to local storage
      try {
        let transactions = transactionStorage.getTransactions() || [];
        
        // Apply filters
        if (filters.type) {
          transactions = transactions.filter(t => t.type === filters.type);
        }
        
        if (filters.status) {
          transactions = transactions.filter(t => t.status === filters.status);
        }
        
        if (filters.hotelId) {
          transactions = transactions.filter(t => t.hotelId === filters.hotelId);
        }
        
        if (filters.serviceId) {
          transactions = transactions.filter(t => t.serviceId === filters.serviceId);
        }
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() >= startDate);
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() <= endDate);
        }
        
        // Apply pagination if needed
        if (filters.offset && filters.limit) {
          transactions = transactions.slice(filters.offset, filters.offset + filters.limit);
        } else if (filters.limit) {
          transactions = transactions.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Transactions retrieved from local storage',
          data: transactions
        };
      } catch (localError) {
        console.error('Local storage get transactions error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get a specific transaction by ID
   * @param {number} id - Transaction ID
   * @returns {Promise<Object>} Transaction data
   */
  async getTransactionById(id) {
    try {
      const response = await api.get(`/transactions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get transaction error:', error);
      
      // Fallback to local storage
      try {
        const transactions = transactionStorage.getTransactions() || [];
        const transaction = transactions.find(t => t.id === id);
        
        if (!transaction) {
          throw new Error('Transaction not found in local storage');
        }
        
        return {
          success: true,
          message: 'Transaction retrieved from local storage',
          data: transaction
        };
      } catch (localError) {
        console.error('Local storage get transaction error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @param {string} transactionData.type - Transaction type (INCOME, EXPENSE)
   * @param {number} transactionData.amount - Transaction amount
   * @param {string} transactionData.incomeCategory - Income category (if type is INCOME)
   * @param {string} transactionData.expenseCategory - Expense category (if type is EXPENSE)
   * @param {string} transactionData.description - Transaction description
   * @param {string} transactionData.date - Transaction date
   * @param {string} transactionData.paymentMethod - Payment method
   * @param {number} transactionData.hotelId - Optional hotel ID
   * @param {number} transactionData.serviceId - Optional service ID
   * @param {string} transactionData.notes - Optional notes
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(transactionData) {
    try {
      const response = await api.post('/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Create transaction error:', error);
      
      // Fallback to local storage
      try {
        const transactions = transactionStorage.getTransactions() || [];
        
        const newTransaction = {
          id: Date.now().toString(),
          ...transactionData,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        transactions.push(newTransaction);
        transactionStorage.setTransactions(transactions);
        
        return {
          success: true,
          message: 'Transaction created in local storage',
          data: newTransaction
        };
      } catch (localError) {
        console.error('Local storage create transaction error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get transaction summary data (admin only)
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.startDate - Filter from start date
   * @param {string} filters.endDate - Filter to end date
   * @param {string} filters.period - Group by time period (day, week, month, year)
   * @returns {Promise<Object>} Transaction summary
   */
  async getFinancialSummary(filters = {}) {
    try {
      const response = await api.get('/transactions/summary', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get transaction summary error:', error);
      
      // Fallback to local storage - generate summary from local data
      try {
        let transactions = transactionStorage.getTransactions() || [];
        
        // Apply date filters if provided
        if (filters.startDate) {
          const startDate = new Date(filters.startDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() >= startDate);
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() <= endDate);
        }
        
        // Calculate summary data
        const totalIncome = transactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
          
        const totalExpenses = transactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
          
        const balance = totalIncome - totalExpenses;
        
        // Group by categories
        const incomeByCategory = {};
        transactions
          .filter(t => t.type === 'INCOME')
          .forEach(t => {
            const category = t.incomeCategory || 'OTHER';
            incomeByCategory[category] = (incomeByCategory[category] || 0) + (t.amount || 0);
          });
          
        const expensesByCategory = {};
        transactions
          .filter(t => t.type === 'EXPENSE')
          .forEach(t => {
            const category = t.expenseCategory || 'OTHER';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + (t.amount || 0);
          });
        
        // Group by period if specified
        let transactionsByPeriod = {};
        
        if (filters.period) {
          transactions.forEach(t => {
            const date = new Date(t.date);
            let periodKey;
            
            switch (filters.period) {
              case 'day':
                periodKey = date.toISOString().slice(0, 10);
                break;
              case 'week':
                // Get the first day of the week (Sunday)
                const firstDay = new Date(date);
                const day = date.getDay();
                firstDay.setDate(date.getDate() - day);
                periodKey = firstDay.toISOString().slice(0, 10);
                break;
              case 'month':
                periodKey = date.toISOString().slice(0, 7);
                break;
              case 'year':
                periodKey = date.getFullYear().toString();
                break;
              default:
                periodKey = date.toISOString().slice(0, 10);
            }
            
            if (!transactionsByPeriod[periodKey]) {
              transactionsByPeriod[periodKey] = {
                income: 0,
                expenses: 0,
                balance: 0
              };
            }
            
            if (t.type === 'INCOME') {
              transactionsByPeriod[periodKey].income += (t.amount || 0);
            } else if (t.type === 'EXPENSE') {
              transactionsByPeriod[periodKey].expenses += (t.amount || 0);
            }
            
            transactionsByPeriod[periodKey].balance = 
              transactionsByPeriod[periodKey].income - transactionsByPeriod[periodKey].expenses;
          });
        }
        
        return {
          success: true,
          message: 'Transaction summary generated from local storage',
          data: {
            totalIncome,
            totalExpenses,
            balance,
            incomeByCategory,
            expensesByCategory,
            periodSummary: transactionsByPeriod
          }
        };
      } catch (localError) {
        console.error('Local storage get transaction summary error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get transactions for a specific hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.startDate - Filter from start date
   * @param {string} filters.endDate - Filter to end date
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Hotel transactions
   */
  async getTransactionsByHotel(hotelId, filters = {}) {
    try {
      const response = await api.get(`/transactions/by-hotel/${hotelId}`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get hotel transactions error:', error);
      
      // Fallback to local storage
      try {
        let transactions = transactionStorage.getTransactions() || [];
        
        // Filter by hotel
        transactions = transactions.filter(t => t.hotelId === hotelId);
        
        // Apply date filters if provided
        if (filters.startDate) {
          const startDate = new Date(filters.startDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() >= startDate);
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate).getTime();
          transactions = transactions.filter(t => new Date(t.date).getTime() <= endDate);
        }
        
        // Apply pagination if needed
        if (filters.offset && filters.limit) {
          transactions = transactions.slice(filters.offset, filters.offset + filters.limit);
        } else if (filters.limit) {
          transactions = transactions.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Hotel transactions retrieved from local storage',
          data: transactions
        };
      } catch (localError) {
        console.error('Local storage get hotel transactions error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get transactions for a specific service
   * @param {number} serviceId - Service ID
   * @returns {Promise<Object>} Service transactions
   */
  async getTransactionsByService(serviceId) {
    try {
      const response = await api.get(`/transactions/by-service/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Get service transactions error:', error);
      
      // Fallback to local storage
      try {
        const transactions = transactionStorage.getTransactions() || [];
        const serviceTransactions = transactions.filter(t => t.serviceId === serviceId);
        
        return {
          success: true,
          message: 'Service transactions retrieved from local storage',
          data: serviceTransactions
        };
      } catch (localError) {
        console.error('Local storage get service transactions error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Update transaction
   * @param {number} id - Transaction ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransaction(id, updateData) {
    try {
      const response = await api.put(`/transactions/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update transaction error:', error);
      
      // Fallback to local storage
      try {
        const transactions = transactionStorage.getTransactions() || [];
        const transactionIndex = transactions.findIndex(t => t.id === id);
        
        if (transactionIndex === -1) {
          throw new Error('Transaction not found in local storage');
        }
        
        const updatedTransaction = {
          ...transactions[transactionIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        
        transactions[transactionIndex] = updatedTransaction;
        transactionStorage.setTransactions(transactions);
        
        return {
          success: true,
          message: 'Transaction updated in local storage',
          data: updatedTransaction
        };
      } catch (localError) {
        console.error('Local storage update transaction error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Upload receipt for a transaction
   * @param {number} id - Transaction ID
   * @param {File} receipt - Receipt file
   * @returns {Promise<Object>} Upload result
   */
  async uploadReceipt(id, receipt) {
    try {
      const formData = new FormData();
      formData.append('receipt', receipt);
      
      const response = await api.post(`/transactions/${id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload receipt error:', error);
      
      // Fallback to local storage
      try {
        // Convert receipt to base64 for local storage
        const reader = new FileReader();
        const receiptPromise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(receipt);
        });
        
        const receiptBase64 = await receiptPromise;
        
        const transactions = transactionStorage.getTransactions() || [];
        const transactionIndex = transactions.findIndex(t => t.id === id);
        
        if (transactionIndex === -1) {
          throw new Error('Transaction not found in local storage');
        }
        
        // Update the transaction with the receipt
        const updatedTransaction = {
          ...transactions[transactionIndex],
          receipt: receiptBase64,
          updatedAt: new Date().toISOString()
        };
        
        transactions[transactionIndex] = updatedTransaction;
        transactionStorage.setTransactions(transactions);
        
        return {
          success: true,
          message: 'Transaction receipt uploaded to local storage',
          data: { receiptUrl: receiptBase64 }
        };
      } catch (localError) {
        console.error('Local storage upload receipt error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get expense categories
   * @returns {Array} List of expense categories
   */
  getExpenseCategories() {
    return [
      { value: 'SUMINISTROS_LAVANDERIA', label: 'Suministros de Lavandería' },
      { value: 'COMBUSTIBLE_TRANSPORTE', label: 'Combustible y Transporte' },
      { value: 'MANTENIMIENTO_EQUIPOS', label: 'Mantenimiento de Equipos' },
      { value: 'SALARIOS_PERSONAL', label: 'Salarios del Personal' },
      { value: 'SERVICIOS_PUBLICOS', label: 'Servicios Públicos' },
      { value: 'MARKETING_PUBLICIDAD', label: 'Marketing y Publicidad' },
      { value: 'OTRO_GASTO', label: 'Otros Gastos' }
    ];
  }
  
  /**
   * Get income categories
   * @returns {Array} List of income categories
   */
  getIncomeCategories() {
    return [
      { value: 'SERVICIO_LAVANDERIA', label: 'Servicio de Lavandería' },
      { value: 'PAGO_HOTEL', label: 'Pago de Hotel' },
      { value: 'SERVICIO_PREMIUM', label: 'Servicio Premium' },
      { value: 'RECARGO_URGENTE', label: 'Recargo por Urgencia' },
      { value: 'OTRO_INGRESO', label: 'Otros Ingresos' }
    ];
  }
  
  /**
   * Get payment methods
   * @returns {Array} List of payment methods
   */
  getPaymentMethods() {
    return [
      { value: 'EFECTIVO', label: 'Efectivo' },
      { value: 'TRANSFERENCIA_BANCARIA', label: 'Transferencia Bancaria' },
      { value: 'YAPE', label: 'Yape' },
      { value: 'PLIN', label: 'Plin' },
      { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
      { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito' },
      { value: 'OTRO', label: 'Otro' }
    ];
  }
  
  /**
   * Get transaction type display info
   * @param {string} type - Transaction type
   * @returns {Object} Type display info with label, color, and icon
   */
  getTypeInfo(type) {
    switch (type) {
      case 'INCOME':
        return {
          label: 'Ingreso',
          color: 'green',
          icon: 'payments'
        };
      case 'EXPENSE':
        return {
          label: 'Gasto',
          color: 'red',
          icon: 'receipt_long'
        };
      default:
        return {
          label: 'Desconocido',
          color: 'gray',
          icon: 'help'
        };
    }
  }
  
  /**
   * Get payment method display info
   * @param {string} method - Payment method
   * @returns {Object} Method display info with label and icon
   */
  getPaymentMethodInfo(method) {
    switch (method) {
      case 'EFECTIVO':
        return {
          label: 'Efectivo',
          icon: 'payments'
        };
      case 'TRANSFERENCIA_BANCARIA':
        return {
          label: 'Transferencia Bancaria',
          icon: 'account_balance'
        };
      case 'YAPE':
        return {
          label: 'Yape',
          icon: 'smartphone'
        };
      case 'PLIN':
        return {
          label: 'Plin',
          icon: 'smartphone'
        };
      case 'TARJETA_CREDITO':
        return {
          label: 'Tarjeta de Crédito',
          icon: 'credit_card'
        };
      case 'TARJETA_DEBITO':
        return {
          label: 'Tarjeta de Débito',
          icon: 'credit_card'
        };
      case 'OTRO':
        return {
          label: 'Otro',
          icon: 'more_horiz'
        };
      default:
        return {
          label: method || 'Desconocido',
          icon: 'help'
        };
    }
  }
  
  /**
   * Format amount for display
   * @param {number} amount - Amount value
   * @returns {string} Formatted amount
   */
  formatAmount(amount) {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }
  
  /**
   * Format date for display
   * @param {string} date - Date string
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} Formatted date
   */
  formatDate(date, includeTime = false) {
    if (!date) return '';
    
    try {
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
      };
      
      return new Date(date).toLocaleDateString('es-PE', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  }
}

export default new TransactionService();