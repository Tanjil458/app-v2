/**
 * Main Application Script
 * Initializes the MimiPro Admin application
 */

(function() {
    'use strict';

    // Application state
    const App = {
        version: '1.0.0',
        isInitialized: false,
        currentUser: null
    };

    /**
     * Initialize the application
     */
    async function init() {
        try {
            console.log('Initializing MimiPro Admin v' + App.version);

            // Wait for database to be ready
            await waitForDatabase();

            // Check for sample data and create if needed
            await initializeSampleData();

            // Set initialized flag
            App.isInitialized = true;

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Wait for database to be initialized
     */
    function waitForDatabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkDB = () => {
                if (window.DB && window.DB.getDB && window.DB.getDB()) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkDB, 100);
                } else {
                    reject(new Error('Database initialization timeout'));
                }
            };

            checkDB();
        });
    }

    /**
     * Initialize sample data if database is empty
     */
    async function initializeSampleData() {
        try {
            // Check if products exist
            const products = await window.DB.getAll('products');
            
            if (products.length === 0) {
                console.log('No products found, creating sample data...');
                
                // Add sample products
                const sampleProducts = [
                    { name: 'Coca Cola 250ml', pcs: 24, price: 20 },
                    { name: 'Pepsi 250ml', pcs: 24, price: 20 },
                    { name: 'Sprite 250ml', pcs: 24, price: 20 },
                    { name: 'Fanta 250ml', pcs: 24, price: 20 },
                    { name: 'Mountain Dew 250ml', pcs: 24, price: 22 }
                ];

                for (const product of sampleProducts) {
                    await window.DB.add('products', product);
                }

                console.log('Sample products created');
            }

            // Check if employees exist
            const employees = await window.DB.getAll('employees');
            
            if (employees.length === 0) {
                console.log('No employees found, creating sample data...');
                
                // Add sample employees
                const sampleEmployees = [
                    {
                        name: 'Mohammad Ali',
                        role: 'deliveryman',
                        phone: '01700000001',
                        salaryType: 'daily',
                        salaryRate: 500,
                        isActive: true
                    },
                    {
                        name: 'Karim Rahman',
                        role: 'helper',
                        phone: '01700000002',
                        salaryType: 'daily',
                        salaryRate: 350,
                        isActive: true
                    }
                ];

                for (const employee of sampleEmployees) {
                    await window.DB.add('employees', employee);
                }

                console.log('Sample employees created');
            }
        } catch (error) {
            console.error('Error initializing sample data:', error);
        }
    }

    /**
     * Show error message to user
     */
    function showError(message) {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="error-page">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Reload</button>
                </div>
            `;
        }
    }

    /**
     * Show success notification
     */
    function showSuccess(message) {
        // You can implement a toast notification here
        console.log('Success:', message);
    }

    /**
     * Format currency
     */
    function formatCurrency(amount) {
        return '৳' + Math.round(amount).toLocaleString('en-BD');
    }

    /**
     * Format date
     */
    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    /**
     * Confirm action
     */
    function confirm(message) {
        return window.confirm(message);
    }

    /**
     * Export application API
     */
    window.App = {
        ...App,
        init,
        showError,
        showSuccess,
        formatCurrency,
        formatDate,
        getTodayDate,
        confirm
    };

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
