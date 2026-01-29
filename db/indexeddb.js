/**
 * IndexedDB Manager for MimiPro Admin
 * Handles all database operations with IndexedDB
 */

(function() {
    'use strict';

    const DB_NAME = 'MimiProDB';
    const DB_VERSION = 2;
    let db = null;

    /**
     * Database Store Definitions
     */
    const STORES = {
        products: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'name', keyPath: 'name', unique: true }
            ]
        },
        history: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'date', keyPath: 'date', unique: false },
                { name: 'name', keyPath: 'name', unique: false }
            ]
        },
        deliveries: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'date', keyPath: 'date', unique: false },
                { name: 'deliverymanId', keyPath: 'deliverymanId', unique: false }
            ]
        },
        employees: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'name', keyPath: 'name', unique: false },
                { name: 'role', keyPath: 'role', unique: false },
                { name: 'isActive', keyPath: 'isActive', unique: false }
            ]
        },
        attendance: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'employeeId', keyPath: 'employeeId', unique: false },
                { name: 'date', keyPath: 'date', unique: false },
                { name: 'employeeDate', keyPath: ['employeeId', 'date'], unique: true }
            ]
        },
        advances: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'employeeId', keyPath: 'employeeId', unique: false },
                { name: 'date', keyPath: 'date', unique: false }
            ]
        },
        credits: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'date', keyPath: 'date', unique: false },
                { name: 'name', keyPath: 'name', unique: false }
            ]
        },
        expenses: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'date', keyPath: 'date', unique: false }
            ]
        },
        stock: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'productId', keyPath: 'productId', unique: true },
                { name: 'productName', keyPath: 'productName', unique: false }
            ]
        },
        syncStatus: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'storeName', keyPath: 'storeName', unique: false },
                { name: 'recordId', keyPath: 'recordId', unique: false },
                { name: 'status', keyPath: 'status', unique: false }
            ]
        }
    };

    /**
     * Initialize IndexedDB
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Database failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('Database opened successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                console.log('Database upgrade needed, current version:', event.oldVersion);

                // Create all stores
                Object.keys(STORES).forEach(storeName => {
                    const storeConfig = STORES[storeName];
                    
                    // Delete existing store if it exists (for upgrades)
                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                    }

                    // Create object store
                    const objectStore = db.createObjectStore(storeName, {
                        keyPath: storeConfig.keyPath,
                        autoIncrement: storeConfig.autoIncrement
                    });

                    // Create indexes
                    if (storeConfig.indexes) {
                        storeConfig.indexes.forEach(index => {
                            objectStore.createIndex(
                                index.name,
                                index.keyPath,
                                { unique: index.unique }
                            );
                        });
                    }

                    console.log(`Created store: ${storeName}`);
                });

                console.log('Database upgrade completed');
            };
        });
    }

    /**
     * Get all records from a store
     */
    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get a single record by ID
     */
    function get(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Add a new record to a store
     */
    function add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Update an existing record
     */
    function update(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete a record by ID
     */
    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clear all records from a store
     */
    function clear(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Query records using an index
     */
    function getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Count records in a store
     */
    function count(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Bulk add records
     */
    function bulkAdd(storeName, dataArray) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const results = [];

                dataArray.forEach((data, index) => {
                    const request = store.add(data);
                    request.onsuccess = () => {
                        results.push(request.result);
                        if (results.length === dataArray.length) {
                            resolve(results);
                        }
                    };
                });

                transaction.onerror = () => reject(transaction.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get database instance
     */
    function getDB() {
        return db;
    }

    /**
     * Close database connection
     */
    function closeDB() {
        if (db) {
            db.close();
            db = null;
            console.log('Database connection closed');
        }
    }

    // Export API to window object
    window.DB = {
        init: initDB,
        getAll,
        get,
        add,
        update,
        remove,
        clear,
        getByIndex,
        count,
        bulkAdd,
        getDB,
        close: closeDB,
        STORES: Object.keys(STORES)
    };

    // Auto-initialize database on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initDB().catch(err => console.error('Failed to initialize database:', err));
        });
    } else {
        initDB().catch(err => console.error('Failed to initialize database:', err));
    }

})();
