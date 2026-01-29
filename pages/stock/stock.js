/**
 * Stock Management Module
 * Handles stock tracking and automatic updates from deliveries
 */

const StockModule = (function() {
    'use strict';

    // ==================== PRIVATE STATE ====================
    let products = [];
    let stockData = [];
    let currentAdjustingStockId = null;

    // DOM Elements (cached after init)
    let elements = {};

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

    /**
     * Get by index
     */
    async function getByIndex(storeName, indexName, value) {
        if (!window.DB) {
            console.error('Database not initialized');
            return [];
        }
        try {
            return await window.DB.getByIndex(storeName, indexName, value);
        } catch (error) {
            console.error(`Error getting by index from ${storeName}:`, error);
            return [];
        }
    }

    // ==================== STOCK MANAGEMENT ====================

    /**
     * Initialize stock for a product if it doesn't exist
     */
    async function initializeStockForProduct(productId, productName) {
        const existingStock = await getByIndex('stock', 'productId', productId);
        
        if (existingStock.length === 0) {
            const stockRecord = {
                productId: productId,
                productName: productName,
                quantity: 0,
                lastUpdated: new Date().toISOString()
            };
            await addToStore('stock', stockRecord);
            return stockRecord;
        }
        return existingStock[0];
    }

    /**
     * Update stock quantity for a product
     */
    async function updateStock(productId, quantityChange, reason = '') {
        const stockRecords = await getByIndex('stock', 'productId', productId);
        
        if (stockRecords.length === 0) {
            console.error('Stock record not found for product:', productId);
            return false;
        }

        const stockRecord = stockRecords[0];
        stockRecord.quantity = Math.max(0, stockRecord.quantity + quantityChange);
        stockRecord.lastUpdated = new Date().toISOString();
        
        // Log the change in history
        const historyRecord = {
            productId: productId,
            productName: stockRecord.productName,
            change: quantityChange,
            newQuantity: stockRecord.quantity,
            reason: reason,
            date: new Date().toISOString()
        };
        await addToStore('history', historyRecord);
        
        await updateInStore('stock', stockRecord);
        return true;
    }

    /**
     * Set stock to a specific quantity
     */
    async function setStock(productId, newQuantity, reason = '') {
        const stockRecords = await getByIndex('stock', 'productId', productId);
        
        if (stockRecords.length === 0) {
            console.error('Stock record not found for product:', productId);
            return false;
        }

        const stockRecord = stockRecords[0];
        const oldQuantity = stockRecord.quantity;
        const change = newQuantity - oldQuantity;
        
        stockRecord.quantity = Math.max(0, newQuantity);
        stockRecord.lastUpdated = new Date().toISOString();
        
        // Log the change in history
        const historyRecord = {
            productId: productId,
            productName: stockRecord.productName,
            change: change,
            oldQuantity: oldQuantity,
            newQuantity: stockRecord.quantity,
            reason: reason,
            date: new Date().toISOString()
        };
        await addToStore('history', historyRecord);
        
        await updateInStore('stock', stockRecord);
        return true;
    }

    // ==================== UI RENDERING ====================

    /**
     * Cache all DOM elements
     */
    function cacheElements() {
        elements = {
            stockTableBody: document.getElementById('stockTableBody'),
            addStockBtn: document.getElementById('addStockBtn'),
            viewHistoryBtn: document.getElementById('viewHistoryBtn'),
            
            // Add Stock Modal
            addStockModal: document.getElementById('addStockModal'),
            stockProductSelect: document.getElementById('stockProductSelect'),
            stockQuantity: document.getElementById('stockQuantity'),
            stockNotes: document.getElementById('stockNotes'),
            closeAddStockModal: document.getElementById('closeAddStockModal'),
            cancelAddStock: document.getElementById('cancelAddStock'),
            confirmAddStock: document.getElementById('confirmAddStock'),
            
            // Adjust Stock Modal
            adjustStockModal: document.getElementById('adjustStockModal'),
            adjustProductName: document.getElementById('adjustProductName'),
            adjustCurrentStock: document.getElementById('adjustCurrentStock'),
            adjustNewQuantity: document.getElementById('adjustNewQuantity'),
            adjustReason: document.getElementById('adjustReason'),
            closeAdjustStockModal: document.getElementById('closeAdjustStockModal'),
            cancelAdjustStock: document.getElementById('cancelAdjustStock'),
            confirmAdjustStock: document.getElementById('confirmAdjustStock')
        };
    }

    /**
     * Render stock table
     */
    async function renderStockTable() {
        if (!elements.stockTableBody) return;

        elements.stockTableBody.innerHTML = '';
        
        stockData = await getAllFromStore('stock');
        
        if (stockData.length === 0) {
            elements.stockTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                        No stock data available. Stock will be created automatically when products are sold.
                    </td>
                </tr>
            `;
            return;
        }

        stockData.forEach(stock => {
            const row = document.createElement('tr');
            
            // Determine status
            let status = 'Normal';
            let statusClass = 'status-normal';
            if (stock.quantity === 0) {
                status = 'Out of Stock';
                statusClass = 'status-out';
            } else if (stock.quantity < 50) {
                status = 'Low Stock';
                statusClass = 'status-low';
            }
            
            row.innerHTML = `
                <td>${stock.productName || 'Unknown'}</td>
                <td style="font-weight: 600;">${stock.quantity}</td>
                <td><span class="stock-status ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary adjust-stock-btn" data-stock-id="${stock.id}">
                        Adjust
                    </button>
                </td>
            `;
            
            elements.stockTableBody.appendChild(row);
        });

        // Add event listeners to adjust buttons
        document.querySelectorAll('.adjust-stock-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const stockId = parseInt(this.getAttribute('data-stock-id'));
                openAdjustStockModal(stockId);
            });
        });
    }

    /**
     * Populate product select dropdown
     */
    async function populateProductSelect() {
        if (!elements.stockProductSelect) return;

        products = await getAllFromStore('products');
        
        elements.stockProductSelect.innerHTML = '<option value="">Select Product</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            elements.stockProductSelect.appendChild(option);
        });
    }

    // ==================== MODAL HANDLERS ====================

    /**
     * Open Add Stock Modal
     */
    function openAddStockModal() {
        if (elements.addStockModal) {
            elements.addStockModal.style.display = 'flex';
            elements.stockQuantity.value = '';
            elements.stockNotes.value = '';
            elements.stockProductSelect.value = '';
        }
    }

    /**
     * Close Add Stock Modal
     */
    function closeAddStockModal() {
        if (elements.addStockModal) {
            elements.addStockModal.style.display = 'none';
        }
    }

    /**
     * Open Adjust Stock Modal
     */
    function openAdjustStockModal(stockId) {
        const stock = stockData.find(s => s.id === stockId);
        if (!stock) return;

        currentAdjustingStockId = stockId;
        
        if (elements.adjustStockModal) {
            elements.adjustProductName.value = stock.productName;
            elements.adjustCurrentStock.value = stock.quantity + ' pieces';
            elements.adjustNewQuantity.value = stock.quantity;
            elements.adjustReason.value = '';
            elements.adjustStockModal.style.display = 'flex';
        }
    }

    /**
     * Close Adjust Stock Modal
     */
    function closeAdjustStockModal() {
        if (elements.adjustStockModal) {
            elements.adjustStockModal.style.display = 'none';
            currentAdjustingStockId = null;
        }
    }

    /**
     * Handle Add Stock Confirmation
     */
    async function handleAddStock() {
        const productId = parseInt(elements.stockProductSelect.value);
        const quantity = parseInt(elements.stockQuantity.value);
        const notes = elements.stockNotes.value;

        if (!productId) {
            alert('Please select a product');
            return;
        }

        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        const product = products.find(p => p.id === productId);
        if (!product) {
            alert('Product not found');
            return;
        }

        // Initialize stock if doesn't exist
        const stockRecord = await initializeStockForProduct(productId, product.name);

        // Update stock
        const reason = notes || 'Manual restock';
        await updateStock(productId, quantity, reason);

        // Get the stock record to mark for sync
        const stockRecords = await getByIndex('stock', 'productId', productId);
        if (stockRecords.length > 0) {
            await markPendingSync('stock', stockRecords[0].id);
        }

        closeAddStockModal();
        await renderStockTable();
        
        alert(`Successfully added ${quantity} pieces to ${product.name}`);
    }

    /**
     * Handle Adjust Stock Confirmation
     */
    async function handleAdjustStock() {
        const newQuantity = parseInt(elements.adjustNewQuantity.value);
        const reason = elements.adjustReason.value;

        if (isNaN(newQuantity) || newQuantity < 0) {
            alert('Please enter a valid quantity');
            return;
        }

        if (!reason) {
            alert('Please provide a reason for the adjustment');
            return;
        }

        const stock = stockData.find(s => s.id === currentAdjustingStockId);
        if (!stock) {
            alert('Stock record not found');
            return;
        }

        await setStock(stock.productId, newQuantity, reason);

        // Mark as pending sync
        await markPendingSync('stock', stock.id);

        closeAdjustStockModal();
        await renderStockTable();
        
        alert('Stock updated successfully');
    }

    // ==================== SYNC TRACKING ====================

    /**
     * Mark a record as pending sync
     */
    async function markPendingSync(storeName, recordId) {
        const syncRecord = {
            storeName: storeName,
            recordId: recordId,
            status: 'pending',
            lastAttempt: null,
            createdAt: new Date().toISOString()
        };
        await addToStore('syncStatus', syncRecord);
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Add Stock Modal
        if (elements.addStockBtn) {
            elements.addStockBtn.addEventListener('click', openAddStockModal);
        }
        
        if (elements.closeAddStockModal) {
            elements.closeAddStockModal.addEventListener('click', closeAddStockModal);
        }
        
        if (elements.cancelAddStock) {
            elements.cancelAddStock.addEventListener('click', closeAddStockModal);
        }
        
        if (elements.confirmAddStock) {
            elements.confirmAddStock.addEventListener('click', handleAddStock);
        }

        // Adjust Stock Modal
        if (elements.closeAdjustStockModal) {
            elements.closeAdjustStockModal.addEventListener('click', closeAdjustStockModal);
        }
        
        if (elements.cancelAdjustStock) {
            elements.cancelAdjustStock.addEventListener('click', closeAdjustStockModal);
        }
        
        if (elements.confirmAdjustStock) {
            elements.confirmAdjustStock.addEventListener('click', handleAdjustStock);
        }

        // Close modals on outside click
        if (elements.addStockModal) {
            elements.addStockModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAddStockModal();
                }
            });
        }
        
        if (elements.adjustStockModal) {
            elements.adjustStockModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAdjustStockModal();
                }
            });
        }
    }

    // ==================== INITIALIZATION ====================

    /**
     * Initialize the module
     */
    async function init() {
        console.log('Initializing Stock Module...');
        
        cacheElements();
        await populateProductSelect();
        await renderStockTable();
        setupEventListeners();
        
        console.log('Stock Module initialized');
    }

    // ==================== PUBLIC API ====================

    return {
        init,
        updateStock,
        setStock,
        initializeStockForProduct,
        renderStockTable
    };

})();

// Export to global scope
window.StockModule = StockModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.Router && window.Router.getCurrentRoute() === '/stock') {
            StockModule.init();
        }
    });
} else {
    if (window.Router && window.Router.getCurrentRoute() === '/stock') {
        StockModule.init();
    }
}
