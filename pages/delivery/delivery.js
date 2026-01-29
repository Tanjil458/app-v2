/**
 * Delivery Calculation Module
 * Handles all delivery calculation logic, cash denominations, and expense tracking
 */

const DeliveryModule = (function() {
    'use strict';

    // ==================== PRIVATE STATE ====================
    let products = [];
    let editingHistoryIndex = -1;
    let pendingDeleteCallback = null;
    let promptResolve = null;

    // DOM Elements (cached after init)
    let elements = {};

    // Cash denomination notes (in BDT)
    const CASH_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

    // ==================== DATABASE HELPERS ====================
    
    /**
     * Get all records from a specific store
     */
    async function getAllFromStore(storeName) {
        if (!window.DB) {
            console.error('Database not initialized');
            return [];
        }
        try {
            return await window.DB.getAll(storeName);
        } catch (error) {
            console.error(`Error getting data from ${storeName}:`, error);
            return [];
        }
    }

    /**
     * Add record to store
     */
    async function addToStore(storeName, data) {
        if (!window.DB) {
            console.error('Database not initialized');
            return null;
        }
        try {
            return await window.DB.add(storeName, data);
        } catch (error) {
            console.error(`Error adding to ${storeName}:`, error);
            return null;
        }
    }

    /**
     * Update record in store
     */
    async function updateInStore(storeName, data) {
        if (!window.DB) {
            console.error('Database not initialized');
            return null;
        }
        try {
            return await window.DB.update(storeName, data);
        } catch (error) {
            console.error(`Error updating ${storeName}:`, error);
            return null;
        }
    }

    // ==================== DOM HELPERS ====================
    
    /**
     * Cache all DOM elements
     */
    function cacheElements() {
        elements = {
            invTable: document.getElementById('invTable'),
            invBody: document.querySelector('#invTable tbody'),
            cashTable: document.getElementById('cashTable'),
            cashBody: document.querySelector('#cashTable tbody'),
            expenseTable: document.getElementById('expenseTable'),
            expenseBody: document.querySelector('#expenseTable tbody'),
            
            // Buttons
            addProductRow: document.getElementById('addProductRow'),
            addExpenseBtn: document.getElementById('addExpenseBtn'),
            saveCalculationBtn: document.getElementById('saveCalculationBtn'),
            
            // Summary displays
            sales: document.getElementById('sales'),
            cash: document.getElementById('cash'),
            totalExpense: document.getElementById('totalExpense'),
            summaryS: document.getElementById('summaryS'),
            summaryC: document.getElementById('summaryC'),
            summaryE: document.getElementById('summaryE'),
            net: document.getElementById('net'),
            
            // Modals
            expenseModal: document.getElementById('expenseModal'),
            expenseName: document.getElementById('expenseName'),
            expenseAmount: document.getElementById('expenseAmount'),
            saveExpenseBtn: document.getElementById('saveExpenseBtn'),
            cancelExpenseBtn: document.getElementById('cancelExpenseBtn'),
            
            customPrompt: document.getElementById('customPrompt'),
            promptTitle: document.getElementById('promptTitle'),
            promptInput: document.getElementById('promptInput'),
            submitPromptBtn: document.getElementById('submitPromptBtn'),
            cancelPromptBtn: document.getElementById('cancelPromptBtn'),
            
            deleteConfirmPopup: document.getElementById('deleteConfirmPopup'),
            confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
            cancelDeleteBtn: document.getElementById('cancelDeleteBtn')
        };
    }

    /**
     * Show custom prompt dialog
     */
    function showCustomPrompt(title, defaultValue = '') {
        return new Promise((resolve) => {
            if (!elements.customPrompt) return resolve(null);
            
            promptResolve = resolve;
            elements.promptTitle.textContent = title;
            elements.promptInput.value = defaultValue;
            elements.customPrompt.classList.add('show');
            elements.promptInput.focus();
        });
    }

    /**
     * Close custom prompt
     */
    function closeCustomPrompt() {
        if (!elements.customPrompt) return;
        elements.customPrompt.classList.remove('show');
        if (promptResolve) {
            promptResolve(null);
            promptResolve = null;
        }
    }

    /**
     * Submit custom prompt
     */
    function submitCustomPrompt() {
        if (!elements.customPrompt || !elements.promptInput) return;
        const value = elements.promptInput.value.trim();
        elements.customPrompt.classList.remove('show');
        if (promptResolve) {
            promptResolve(value);
            promptResolve = null;
        }
    }

    /**
     * Show delete confirmation dialog
     */
    function showDeleteConfirm(callback) {
        if (!elements.deleteConfirmPopup) return;
        pendingDeleteCallback = callback;
        elements.deleteConfirmPopup.classList.add('show');
    }

    /**
     * Close delete confirmation
     */
    function closeDeleteConfirm() {
        if (!elements.deleteConfirmPopup) return;
        elements.deleteConfirmPopup.classList.remove('show');
        pendingDeleteCallback = null;
    }

    /**
     * Confirm delete action
     */
    function confirmDeleteAction() {
        if (pendingDeleteCallback) {
            pendingDeleteCallback();
        }
        closeDeleteConfirm();
    }

    // ==================== SWIPE TO DELETE ====================
    
    /**
     * Add swipe-to-delete functionality to a table row
     */
    function addSwipeToDelete(row, deleteCallback) {
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;
        let hasMoved = false;

        row.addEventListener('touchstart', (e) => {
            // Don't interfere with input/select elements
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            const point = e.touches[0];
            startX = point.clientX;
            currentX = startX;
            isSwiping = true;
            hasMoved = false;
        }, { passive: false });

        row.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            const point = e.touches[0];
            currentX = point.clientX;
            const diff = startX - currentX;

            if (Math.abs(diff) > 10) {
                hasMoved = true;
                e.preventDefault();
            }

            if (diff > 0 && diff < 150) {
                row.style.transform = `translateX(-${diff}px)`;
                row.style.transition = 'none';
            }
        }, { passive: false });

        row.addEventListener('touchend', () => {
            if (!isSwiping) return;
            
            const diff = startX - currentX;
            
            if (diff > 100) {
                // Swipe threshold met - show delete confirmation
                row.style.transition = 'transform 0.3s';
                row.style.transform = 'translateX(-150px)';
                showDeleteConfirm(() => {
                    deleteCallback();
                    row.style.transform = '';
                });
            } else {
                // Reset position
                row.style.transition = 'transform 0.3s';
                row.style.transform = '';
            }
            
            isSwiping = false;
        });
    }

    // ==================== CALCULATION LOGIC ====================
    
    /**
     * Calculate all totals (sales, cash, expenses, net)
     */
    function calculateAll() {
        if (!elements.invBody) return;
        
        // Calculate sales total
        let salesTotal = 0;
        elements.invBody.querySelectorAll('tr').forEach(row => {
            const cells = row.children;
            const dc = parseFloat(cells[1]?.querySelector('input')?.value || 0);
            const dp = parseFloat(cells[2]?.querySelector('input')?.value || 0);
            const rc = parseFloat(cells[3]?.querySelector('input')?.value || 0);
            const rp = parseFloat(cells[4]?.querySelector('input')?.value || 0);
            const price = parseFloat(cells[6]?.querySelector('input')?.value || 0);
            
            // Get product to calculate pieces per carton
            const productName = cells[0]?.querySelector('select')?.value;
            const product = products.find(p => p.name === productName);
            const pcs = product ? product.pcs : 1;
            
            // Calculate sold quantity
            const deliveredPcs = (dc * pcs) + dp;
            const returnedPcs = (rc * pcs) + rp;
            const soldPcs = deliveredPcs - returnedPcs;
            
            // Update sold display
            if (cells[5]) cells[5].textContent = soldPcs;
            
            // Calculate total
            const total = soldPcs * price;
            if (cells[7]) cells[7].textContent = Math.round(total);
            
            salesTotal += total;
        });

        // Calculate cash total
        let cashTotal = 0;
        if (elements.cashBody) {
            elements.cashBody.querySelectorAll('tr').forEach(row => {
                const noteValue = parseInt(row.cells[0]?.textContent.replace('৳', '') || 0);
                const qty = parseFloat(row.cells[1]?.querySelector('input')?.value || 0);
                const total = noteValue * qty;
                if (row.cells[2]) row.cells[2].textContent = Math.round(total);
                cashTotal += total;
            });
        }

        // Calculate expense total
        let expenseTotal = 0;
        if (elements.expenseBody) {
            elements.expenseBody.querySelectorAll('tr').forEach(row => {
                const amount = parseFloat(row.cells[1]?.querySelector('input')?.value || 0);
                expenseTotal += amount;
            });
        }

        // Calculate net total
        const netTotal = salesTotal - cashTotal - expenseTotal;

        // Update all displays
        updateSummaryDisplays(salesTotal, cashTotal, expenseTotal, netTotal);
    }

    /**
     * Update all summary displays
     */
    function updateSummaryDisplays(sales, cash, expense, net) {
        if (elements.sales) elements.sales.textContent = Math.round(sales);
        if (elements.cash) elements.cash.textContent = Math.round(cash);
        if (elements.totalExpense) elements.totalExpense.textContent = Math.round(expense);
        if (elements.summaryS) elements.summaryS.textContent = Math.round(sales);
        if (elements.summaryC) elements.summaryC.textContent = Math.round(cash);
        if (elements.summaryE) elements.summaryE.textContent = Math.round(expense);
        if (elements.net) elements.net.textContent = Math.round(net);
    }

    // ==================== PRODUCT ROW MANAGEMENT ====================
    
    /**
     * Add a new product row to the table
     */
    function addProductRow() {
        if (!elements.invBody) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><select class="form-control"></select></td>
            <td class="col-green"><input type="number" class="form-control" value="0" min="0"></td>
            <td class="col-green"><input type="number" class="form-control" value="0" min="0"></td>
            <td class="col-red"><input type="number" class="form-control" value="0" min="0"></td>
            <td class="col-red"><input type="number" class="form-control" value="0" min="0"></td>
            <td class="readonly">0</td>
            <td><input type="number" class="form-control" value="0" min="0"></td>
            <td class="readonly">0</td>
        `;

        // Populate product dropdown
        const select = row.querySelector('select');
        products.forEach(product => {
            const option = new Option(product.name, product.name);
            select.add(option);
        });

        // Auto-fill price when product is selected
        select.addEventListener('change', function() {
            const selectedProduct = products.find(p => p.name === this.value);
            if (selectedProduct && row.children[6]) {
                const priceInput = row.children[6].querySelector('input');
                if (priceInput) priceInput.value = selectedProduct.price;
                calculateAll();
            }
        });

        // Add calculation listeners to all inputs
        row.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', calculateAll);
        });

        // Add swipe-to-delete
        addSwipeToDelete(row, () => {
            row.remove();
            calculateAll();
        });

        elements.invBody.appendChild(row);
    }

    /**
     * Refresh all product dropdowns
     */
    function refreshProductSelects() {
        if (!elements.invBody) return;
        
        elements.invBody.querySelectorAll('select').forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            products.forEach(product => {
                const option = new Option(product.name, product.name);
                select.add(option);
            });
            select.value = currentValue;
        });
    }

    // ==================== CASH DENOMINATION TABLE ====================
    
    /**
     * Initialize cash denomination table
     */
    function initializeCashTable() {
        if (!elements.cashBody) return;
        
        elements.cashBody.innerHTML = '';
        CASH_NOTES.forEach(noteValue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600;">৳${noteValue}</td>
                <td><input type="number" class="form-control" value="0" min="0"></td>
                <td class="readonly">0</td>
            `;
            
            const input = row.querySelector('input');
            input.addEventListener('input', calculateAll);
            
            elements.cashBody.appendChild(row);
        });
    }

    // ==================== EXPENSE MANAGEMENT ====================
    
    /**
     * Show expense modal
     */
    function showExpenseModal() {
        if (!elements.expenseModal) return;
        elements.expenseModal.classList.add('show');
        if (elements.expenseName) elements.expenseName.value = '';
        if (elements.expenseAmount) elements.expenseAmount.value = '';
        if (elements.expenseName) elements.expenseName.focus();
    }

    /**
     * Close expense modal
     */
    function closeExpenseModal() {
        if (!elements.expenseModal) return;
        elements.expenseModal.classList.remove('show');
    }

    /**
     * Save expense from modal
     */
    function saveExpenseFromModal() {
        if (!elements.expenseName || !elements.expenseAmount || !elements.expenseBody) return;
        
        const name = elements.expenseName.value.trim();
        const amount = parseFloat(elements.expenseAmount.value);
        
        if (!name || !amount || amount <= 0) {
            alert('Please enter a valid expense name and amount');
            return;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td><input type="number" class="form-control" value="${amount}" min="0"></td>
        `;

        const input = row.querySelector('input');
        input.addEventListener('input', calculateAll);

        // Add swipe-to-delete
        addSwipeToDelete(row, () => {
            row.remove();
            calculateAll();
        });

        elements.expenseBody.appendChild(row);
        calculateAll();
        closeExpenseModal();
    }

    // ==================== SAVE CALCULATION ====================
    
    /**
     * Save the current calculation to database
     */
    async function saveCalculation() {
        if (!elements.invBody) return;
        
        // Validate that there are products
        if (elements.invBody.querySelectorAll('tr').length === 0) {
            alert('Please add at least one product before saving');
            return;
        }

        // Get customer name
        let customerName;
        if (editingHistoryIndex === -1) {
            customerName = await showCustomPrompt('Enter Customer Name', '');
        } else {
            const history = await getAllFromStore('history');
            customerName = history[editingHistoryIndex]?.name.split(', ')[0] || '';
        }

        if (!customerName) {
            alert('Customer name is required');
            return;
        }

        // Collect calculation data
        const calculationData = [];
        elements.invBody.querySelectorAll('tr').forEach(row => {
            const cells = row.children;
            const productName = cells[0]?.querySelector('select')?.value;
            const dc = parseFloat(cells[1]?.querySelector('input')?.value || 0);
            const dp = parseFloat(cells[2]?.querySelector('input')?.value || 0);
            const rc = parseFloat(cells[3]?.querySelector('input')?.value || 0);
            const rp = parseFloat(cells[4]?.querySelector('input')?.value || 0);
            const sold = parseInt(cells[5]?.textContent || 0);
            const price = parseFloat(cells[6]?.querySelector('input')?.value || 0);
            const total = parseFloat(cells[7]?.textContent || 0);

            if (productName) {
                calculationData.push({
                    product: productName,
                    dc, dp, rc, rp, sold, price, total
                });
            }
        });

        if (calculationData.length === 0) {
            alert('No valid products found');
            return;
        }

        // Collect expense data
        const expenseData = [];
        if (elements.expenseBody) {
            elements.expenseBody.querySelectorAll('tr').forEach(row => {
                const name = row.cells[0]?.textContent || '';
                const amount = parseFloat(row.cells[1]?.querySelector('input')?.value || 0);
                if (name && amount > 0) {
                    expenseData.push({ name, amount });
                }
            });
        }

        // Collect cash detail
        const cashDetail = [];
        if (elements.cashBody) {
            elements.cashBody.querySelectorAll('tr').forEach(row => {
                const note = row.cells[0]?.textContent || '';
                const qty = parseFloat(row.cells[1]?.querySelector('input')?.value || 0);
                const total = parseFloat(row.cells[2]?.textContent || 0);
                if (qty > 0) {
                    cashDetail.push({ note, qty, total });
                }
            });
        }

        // Create record
        const date = new Date().toISOString();
        const record = {
            name: `${customerName}, ${new Date(date).toLocaleDateString()}`,
            date,
            sales: elements.sales?.textContent || '0',
            cash: elements.cash?.textContent || '0',
            totalExpense: elements.totalExpense?.textContent || '0',
            net: elements.net?.textContent || '0',
            calculation: calculationData,
            expenses: expenseData,
            cashDetail
        };

        try {
            if (editingHistoryIndex === -1) {
                // Add new record
                await addToStore('history', record);
                
                // Update stock for each product (deduct sold quantity)
                for (const item of calculationData) {
                    if (item.sold > 0) {
                        const product = products.find(p => p.name === item.product);
                        if (product) {
                            // Initialize stock if it doesn't exist
                            if (window.StockModule) {
                                await window.StockModule.initializeStockForProduct(product.id, product.name);
                                // Deduct sold quantity from stock
                                await window.StockModule.updateStock(product.id, -item.sold, `Delivery to ${customerName}`);
                            }
                        }
                    }
                }
                
                alert('Calculation saved successfully! Stock updated.');
            } else {
                // Update existing record
                const history = await getAllFromStore('history');
                const existingRecord = history[editingHistoryIndex];
                if (existingRecord && existingRecord.id) {
                    record.id = existingRecord.id;
                    await updateInStore('history', record);
                    alert('Calculation updated successfully!');
                }
                editingHistoryIndex = -1;
            }
            clearForm();
        } catch (error) {
            console.error('Error saving calculation:', error);
            alert('Failed to save calculation. Please try again.');
        }
    }

    /**
     * Clear the form and reset to initial state
     */
    function clearForm() {
        if (elements.invBody) elements.invBody.innerHTML = '';
        if (elements.expenseBody) elements.expenseBody.innerHTML = '';
        
        // Reset cash table
        if (elements.cashBody) {
            elements.cashBody.querySelectorAll('input').forEach(input => {
                input.value = '0';
            });
        }
        
        calculateAll();
        addProductRow(); // Add one default row
    }

    /**
     * Load calculation for editing
     */
    async function loadCalculationForEdit(index) {
        const history = await getAllFromStore('history');
        if (!history[index]) return;

        editingHistoryIndex = index;
        const record = history[index];

        // Clear and load products
        if (elements.invBody) {
            elements.invBody.innerHTML = '';
            record.calculation.forEach(calc => {
                addProductRow();
                const row = elements.invBody.lastElementChild;
                if (row) {
                    const cells = row.children;
                    if (cells[0]?.querySelector('select')) cells[0].querySelector('select').value = calc.product;
                    if (cells[1]?.querySelector('input')) cells[1].querySelector('input').value = calc.dc;
                    if (cells[2]?.querySelector('input')) cells[2].querySelector('input').value = calc.dp;
                    if (cells[3]?.querySelector('input')) cells[3].querySelector('input').value = calc.rc;
                    if (cells[4]?.querySelector('input')) cells[4].querySelector('input').value = calc.rp;
                    if (cells[6]?.querySelector('input')) cells[6].querySelector('input').value = calc.price;
                }
            });
        }

        // Load expenses
        if (elements.expenseBody && record.expenses) {
            elements.expenseBody.innerHTML = '';
            record.expenses.forEach(exp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${exp.name}</td>
                    <td><input type="number" class="form-control" value="${exp.amount}"></td>
                `;
                const input = row.querySelector('input');
                input.addEventListener('input', calculateAll);
                addSwipeToDelete(row, () => {
                    row.remove();
                    calculateAll();
                });
                elements.expenseBody.appendChild(row);
            });
        }

        // Load cash detail
        if (elements.cashBody && record.cashDetail) {
            record.cashDetail.forEach(cash => {
                const noteValue = cash.note.replace('৳', '');
                const row = Array.from(elements.cashBody.querySelectorAll('tr')).find(r => 
                    r.cells[0]?.textContent === cash.note
                );
                if (row && row.cells[1]?.querySelector('input')) {
                    row.cells[1].querySelector('input').value = cash.qty;
                }
            });
        }

        calculateAll();
    }

    // ==================== EVENT LISTENERS ====================
    
    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Button click events
        if (elements.addProductRow) {
            elements.addProductRow.addEventListener('click', addProductRow);
        }
        
        if (elements.addExpenseBtn) {
            elements.addExpenseBtn.addEventListener('click', showExpenseModal);
        }
        
        if (elements.saveCalculationBtn) {
            elements.saveCalculationBtn.addEventListener('click', saveCalculation);
        }
        
        // Expense modal events
        if (elements.saveExpenseBtn) {
            elements.saveExpenseBtn.addEventListener('click', saveExpenseFromModal);
        }
        
        if (elements.cancelExpenseBtn) {
            elements.cancelExpenseBtn.addEventListener('click', closeExpenseModal);
        }
        
        // Custom prompt events
        if (elements.submitPromptBtn) {
            elements.submitPromptBtn.addEventListener('click', submitCustomPrompt);
        }
        
        if (elements.cancelPromptBtn) {
            elements.cancelPromptBtn.addEventListener('click', closeCustomPrompt);
        }
        
        // Allow Enter key in prompt
        if (elements.promptInput) {
            elements.promptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitCustomPrompt();
                }
            });
        }
        
        // Delete confirmation events
        if (elements.confirmDeleteBtn) {
            elements.confirmDeleteBtn.addEventListener('click', confirmDeleteAction);
        }
        
        if (elements.cancelDeleteBtn) {
            elements.cancelDeleteBtn.addEventListener('click', closeDeleteConfirm);
        }
    }

    // ==================== INITIALIZATION ====================
    
    /**
     * Initialize the delivery module
     */
    async function init() {
        try {
            // Wait for database to be ready
            if (!window.DB) {
                console.warn('Database not ready, retrying...');
                setTimeout(init, 100);
                return;
            }

            // Cache DOM elements
            cacheElements();

            // Load products from database
            products = await getAllFromStore('products');
            
            // Initialize tables
            initializeCashTable();
            
            // Add one default product row
            addProductRow();
            
            // Setup event listeners
            setupEventListeners();
            
            // Initial calculation
            calculateAll();
            
            console.log('Delivery module initialized successfully');
        } catch (error) {
            console.error('Error initializing delivery module:', error);
        }
    }

    // ==================== PUBLIC API ====================
    
    return {
        init,
        addProductRow,
        calculateAll,
        saveCalculation,
        clearForm,
        loadCalculationForEdit,
        refreshProductSelects
    };

})();

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DeliveryModule.init());
} else {
    DeliveryModule.init();
}
