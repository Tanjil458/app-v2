/**
 * Sync Manager
 * Handles sync status tracking and automatic sync
 */

(function() {
    'use strict';

    let syncInterval = null;
    let menuDropdown = null;
    let menuBtn = null;
    let syncStatusModal = null;

    /**
     * Initialize sync manager
     */
    function init() {
        // Cache elements
        menuBtn = document.getElementById('menuBtn');
        menuDropdown = document.getElementById('menuDropdown');
        syncStatusModal = document.getElementById('syncStatusModal');
        
        const syncStatusBtn = document.getElementById('syncStatusBtn');
        const closeSyncModal = document.getElementById('closeSyncModal');
        const closeSyncBtn = document.getElementById('closeSyncBtn');
        const syncNowBtn = document.getElementById('syncNowBtn');

        // Set up event listeners
        if (menuBtn) {
            menuBtn.addEventListener('click', toggleMenu);
        }

        if (syncStatusBtn) {
            syncStatusBtn.addEventListener('click', () => {
                hideMenu();
                showSyncStatusModal();
            });
        }

        if (closeSyncModal) {
            closeSyncModal.addEventListener('click', hideSyncStatusModal);
        }

        if (closeSyncBtn) {
            closeSyncBtn.addEventListener('click', hideSyncStatusModal);
        }

        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', performSync);
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menuDropdown && menuBtn) {
                if (!menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
                    hideMenu();
                }
            }
        });

        // Close modal when clicking outside
        if (syncStatusModal) {
            syncStatusModal.addEventListener('click', (e) => {
                if (e.target === syncStatusModal) {
                    hideSyncStatusModal();
                }
            });
        }

        // Start auto-sync check
        startAutoSync();
        
        // Initial sync status check
        updateSyncStatus();

        console.log('Sync Manager initialized');
    }

    /**
     * Toggle menu dropdown
     */
    function toggleMenu() {
        if (menuDropdown) {
            if (menuDropdown.style.display === 'none' || !menuDropdown.style.display) {
                menuDropdown.style.display = 'block';
            } else {
                menuDropdown.style.display = 'none';
            }
        }
    }

    /**
     * Hide menu dropdown
     */
    function hideMenu() {
        if (menuDropdown) {
            menuDropdown.style.display = 'none';
        }
    }

    /**
     * Show sync status modal
     */
    function showSyncStatusModal() {
        if (syncStatusModal) {
            syncStatusModal.style.display = 'flex';
            updateSyncStatusDetails();
        }
    }

    /**
     * Hide sync status modal
     */
    function hideSyncStatusModal() {
        if (syncStatusModal) {
            syncStatusModal.style.display = 'none';
        }
    }

    /**
     * Update sync status badge
     */
    async function updateSyncStatus() {
        try {
            const syncBadge = document.getElementById('syncBadge');
            if (!syncBadge) return;

            // Get pending sync items
            const pendingItems = await getPendingSyncItems();
            
            if (pendingItems.length === 0) {
                syncBadge.textContent = 'Up to date';
                syncBadge.className = 'sync-badge sync-up-to-date';
            } else {
                syncBadge.textContent = `${pendingItems.length} pending`;
                syncBadge.className = 'sync-badge sync-pending';
            }
        } catch (error) {
            console.error('Error updating sync status:', error);
        }
    }

    /**
     * Update sync status details in modal
     */
    async function updateSyncStatusDetails() {
        try {
            const syncStatus = document.getElementById('syncStatus');
            const lastSync = document.getElementById('lastSync');
            const pendingCount = document.getElementById('pendingCount');
            const syncDetails = document.getElementById('syncDetails');

            // Get pending sync items
            const pendingItems = await getPendingSyncItems();
            
            if (syncStatus) {
                if (pendingItems.length === 0) {
                    syncStatus.textContent = 'All data synced';
                    syncStatus.style.color = '#28a745';
                } else {
                    syncStatus.textContent = 'Sync pending';
                    syncStatus.style.color = '#ffc107';
                }
            }

            if (pendingCount) {
                pendingCount.textContent = pendingItems.length;
            }

            // Get last sync time from localStorage
            const lastSyncTime = localStorage.getItem('lastSyncTime');
            if (lastSync) {
                if (lastSyncTime) {
                    const date = new Date(lastSyncTime);
                    lastSync.textContent = date.toLocaleString();
                } else {
                    lastSync.textContent = 'Never';
                }
            }

            // Display pending items details
            if (syncDetails) {
                if (pendingItems.length > 0) {
                    syncDetails.innerHTML = `
                        <div class="sync-pending-items">
                            <h4 style="margin: 0 0 8px 0; font-size: 0.875rem;">Pending Changes:</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 0.875rem;">
                                ${groupPendingItems(pendingItems)}
                            </ul>
                        </div>
                    `;
                } else {
                    syncDetails.innerHTML = '<p style="color: #28a745; font-size: 0.875rem; margin: 0;">All changes synced successfully!</p>';
                }
            }
        } catch (error) {
            console.error('Error updating sync status details:', error);
        }
    }

    /**
     * Group pending items by store
     */
    function groupPendingItems(items) {
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.storeName]) {
                grouped[item.storeName] = 0;
            }
            grouped[item.storeName]++;
        });

        return Object.keys(grouped).map(storeName => {
            return `<li>${grouped[storeName]} ${storeName} record(s)</li>`;
        }).join('');
    }

    /**
     * Get pending sync items
     */
    async function getPendingSyncItems() {
        if (!window.DB) {
            return [];
        }
        
        try {
            const allSyncItems = await window.DB.getAll('syncStatus');
            return allSyncItems.filter(item => item.status === 'pending');
        } catch (error) {
            console.error('Error getting pending sync items:', error);
            return [];
        }
    }

    /**
     * Perform sync
     */
    async function performSync() {
        const syncNowBtn = document.getElementById('syncNowBtn');
        const originalText = syncNowBtn ? syncNowBtn.textContent : '';
        
        try {
            if (syncNowBtn) {
                syncNowBtn.textContent = 'Syncing...';
                syncNowBtn.disabled = true;
            }

            // Get pending items
            const pendingItems = await getPendingSyncItems();
            
            if (pendingItems.length === 0) {
                alert('No pending changes to sync');
                return;
            }

            // TODO: Implement actual sync logic here
            // For now, we'll just simulate sync by marking items as synced
            console.log('Syncing', pendingItems.length, 'items...');
            
            // Simulate sync delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mark all as synced (in real implementation, this would happen after successful upload)
            for (const item of pendingItems) {
                item.status = 'synced';
                item.lastAttempt = new Date().toISOString();
                await window.DB.update('syncStatus', item);
            }

            // Update last sync time
            localStorage.setItem('lastSyncTime', new Date().toISOString());

            // Update UI
            await updateSyncStatus();
            await updateSyncStatusDetails();

            alert('Sync completed successfully!');
        } catch (error) {
            console.error('Sync error:', error);
            alert('Sync failed. Please try again.');
        } finally {
            if (syncNowBtn) {
                syncNowBtn.textContent = originalText;
                syncNowBtn.disabled = false;
            }
        }
    }

    /**
     * Start automatic sync checking
     */
    function startAutoSync() {
        // Check sync status every 30 seconds
        syncInterval = setInterval(() => {
            updateSyncStatus();
        }, 30000);

        console.log('Auto-sync started (checking every 30 seconds)');
    }

    /**
     * Stop automatic sync checking
     */
    function stopAutoSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
            console.log('Auto-sync stopped');
        }
    }

    // Export to global scope
    window.SyncManager = {
        init,
        updateSyncStatus,
        performSync,
        startAutoSync,
        stopAutoSync
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
