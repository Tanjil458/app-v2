/**
 * Router Module for MimiPro Admin
 * Handles client-side routing and page navigation
 */

(function() {
    'use strict';

    // Route definitions
    const routes = {
        '/': 'pages/dashboard/dashboard.html',
        '/dashboard': 'pages/dashboard/dashboard.html',
        '/delivery': 'pages/delivery/delivery.html',
        '/stock': 'pages/stock/stock.html',
        '/employees': 'pages/employees/employees.html',
        '/attendance': 'pages/attendance/attendance.html',
        '/credits': 'pages/credits/cretits.html',
        '/expenses': 'pages/expenses/expenses.html',
        '/reports': 'pages/reports/reports.html'
    };

    // Current route state
    let currentRoute = null;
    let currentPageModule = null;

    /**
     * Load page content
     */
    async function loadPage(path) {
        const contentArea = document.getElementById('content');
        const route = routes[path] || routes['/'];

        if (!contentArea) {
            console.error('Content area not found');
            return;
        }

        try {
            // Show loading state
            contentArea.innerHTML = '<div class="loading">Loading...</div>';

            // Fetch page content
            const response = await fetch(route);
            
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.statusText}`);
            }

            const html = await response.text();
            contentArea.innerHTML = html;

            // Execute any script tags in the loaded HTML
            executeScripts(contentArea);

            // Update active navigation
            updateActiveNav(path);

            // Store current route
            currentRoute = path;

            console.log(`Loaded page: ${path}`);
        } catch (error) {
            console.error('Error loading page:', error);
            contentArea.innerHTML = `
                <div class="error-page">
                    <h2>Oops! Something went wrong</h2>
                    <p>Failed to load the page. Please try again.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
                </div>
            `;
        }
    }

    /**
     * Execute script tags in loaded HTML
     */
    function executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy inline script content or handle external scripts
            if (oldScript.src) {
                // For external scripts, we need to handle the load event
                newScript.onload = () => {
                    // Find and execute any inline scripts that depend on this
                    executeInlineScripts(container);
                };
            } else {
                // For inline scripts, copy the content
                newScript.textContent = oldScript.textContent;
            }
            
            // Replace old script with new one to execute it
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        
        // Execute inline scripts after a short delay to ensure external scripts loaded
        setTimeout(() => executeInlineScripts(container), 100);
    }
    
    /**
     * Execute only inline scripts
     */
    function executeInlineScripts(container) {
        const scripts = container.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
            try {
                eval(script.textContent);
            } catch (error) {
                console.error('Error executing inline script:', error);
            }
        });
    }

    /**
     * Update active navigation item
     */
    function updateActiveNav(path) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item, .menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to matching nav item
        const navItem = document.querySelector(`[data-route="${path}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    /**
     * Navigate to a route
     */
    function navigateTo(path) {
        // Normalize path
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Check if route exists
        if (!routes[path] && path !== '/') {
            console.warn(`Route not found: ${path}, redirecting to dashboard`);
            path = '/';
        }

        // Update browser history
        window.history.pushState({ path }, '', path);

        // Load page
        loadPage(path);
    }

    /**
     * Handle browser back/forward buttons
     */
    function handlePopState(event) {
        const path = event.state?.path || '/';
        loadPage(path);
    }

    /**
     * Handle navigation link clicks
     */
    function handleNavClick(event) {
        const target = event.target.closest('[data-route]');
        
        if (target) {
            event.preventDefault();
            const route = target.getAttribute('data-route');
            navigateTo(route);
        }
    }

    /**
     * Initialize router
     */
    function init() {
        // Set up click handlers for navigation
        document.addEventListener('click', handleNavClick);

        // Handle browser back/forward
        window.addEventListener('popstate', handlePopState);

        // Load initial page based on current URL
        const initialPath = window.location.pathname || '/';
        
        // Replace initial state
        window.history.replaceState({ path: initialPath }, '', initialPath);
        
        // Load initial page
        loadPage(initialPath);

        console.log('Router initialized');
    }

    /**
     * Register a new route
     */
    function registerRoute(path, pageUrl) {
        routes[path] = pageUrl;
        console.log(`Route registered: ${path} -> ${pageUrl}`);
    }

    /**
     * Get current route
     */
    function getCurrentRoute() {
        return currentRoute;
    }

    /**
     * Reload current page
     */
    function reload() {
        if (currentRoute) {
            loadPage(currentRoute);
        }
    }

    // Export router API
    window.Router = {
        init,
        navigateTo,
        registerRoute,
        getCurrentRoute,
        reload,
        routes
    };

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
