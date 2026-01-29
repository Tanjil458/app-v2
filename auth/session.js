// Session Management Module
// Handles user session creation, validation, and cleanup

const SessionManager = {
    // Session storage key
    SESSION_KEY: 'mimipro_session',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

    /**
     * Create a new session for a user
     * @param {string} employeeId - Employee ID
     * @param {string} employeeName - Employee name
     * @param {boolean} isOwner - Whether user is owner/admin
     */
    createSession(employeeId, employeeName, isOwner = false) {
        const session = {
            employeeId,
            employeeName,
            isOwner,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.SESSION_TIMEOUT
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return session;
    },

    /**
     * Get current session
     * @returns {Object|null} Session object or null if no valid session
     */
    getSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            if (!sessionData) {
                return null;
            }

            const session = JSON.parse(sessionData);
            
            // Check if session has expired
            if (Date.now() > session.expiresAt) {
                this.clearSession();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            this.clearSession();
            return null;
        }
    },

    /**
     * Check if there's a valid session
     * @returns {boolean} True if session is valid
     */
    isSessionValid() {
        return this.getSession() !== null;
    },

    /**
     * Check if current user is owner/admin
     * @returns {boolean} True if user is owner
     */
    isOwner() {
        const session = this.getSession();
        return session ? session.isOwner : false;
    },

    /**
     * Get current user's employee ID
     * @returns {string|null} Employee ID or null
     */
    getCurrentEmployeeId() {
        const session = this.getSession();
        return session ? session.employeeId : null;
    },

    /**
     * Get current user's employee name
     * @returns {string|null} Employee name or null
     */
    getCurrentEmployeeName() {
        const session = this.getSession();
        return session ? session.employeeName : null;
    },

    /**
     * Clear current session (logout)
     */
    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    },

    /**
     * Refresh session expiry time
     */
    refreshSession() {
        const session = this.getSession();
        if (session) {
            session.expiresAt = Date.now() + this.SESSION_TIMEOUT;
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        }
    }
};

// Auto-refresh session on activity
if (typeof window !== 'undefined') {
    ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            if (SessionManager.isSessionValid()) {
                // Refresh session every 30 minutes of activity
                const session = SessionManager.getSession();
                const timeSinceCreated = Date.now() - session.createdAt;
                if (timeSinceCreated > 30 * 60 * 1000) {
                    SessionManager.refreshSession();
                }
            }
        }, { passive: true, once: false });
    });
}
