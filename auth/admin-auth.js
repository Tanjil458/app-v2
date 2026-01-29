// Authentication Module
// Handles employee/admin authentication with secure password hashing

const AuthManager = {
    // Owner/Admin bypass credentials (for initial setup)
    OWNER_BYPASS_ID: 'owner',
    
    /**
     * Hash a password using Web Crypto API (PBKDF2)
     * @param {string} password - Plain text password
     * @param {string} salt - Optional salt (generated if not provided)
     * @returns {Promise<Object>} Object with hash and salt
     */
    async hashPassword(password, salt = null) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        // Generate or use provided salt
        if (!salt) {
            const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
            salt = Array.from(saltBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        try {
            // Import password as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                data,
                'PBKDF2',
                false,
                ['deriveBits']
            );
            
            // Derive bits using PBKDF2
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                256
            );
            
            // Convert to hex string
            const hashArray = Array.from(new Uint8Array(derivedBits));
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return { hash, salt };
        } catch (error) {
            console.error('Error hashing password:', error);
            throw new Error('Failed to hash password');
        }
    },

    /**
     * Verify a password against a stored hash
     * @param {string} password - Plain text password to verify
     * @param {string} storedHash - Stored password hash
     * @param {string} salt - Salt used for hashing
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, storedHash, salt) {
        try {
            const { hash } = await this.hashPassword(password, salt);
            return hash === storedHash;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    },

    /**
     * Login with employee ID and password
     * @param {string} employeeId - Employee ID or name
     * @param {string} password - Plain text password
     * @returns {Promise<Object>} Login result with success status and message
     */
    async login(employeeId, password) {
        try {
            // Validate inputs
            if (!employeeId || !password) {
                return {
                    success: false,
                    message: 'Please enter both Employee ID and password'
                };
            }

            // Check for owner bypass
            if (employeeId.toLowerCase() === this.OWNER_BYPASS_ID) {
                // Owner can use any password (for initial setup)
                // In production, you should verify against a master password
                SessionManager.createSession('owner', 'Owner/Admin', true);
                return {
                    success: true,
                    message: 'Logged in as Owner/Admin',
                    isOwner: true
                };
            }

            // Get employee from database
            const db = await DatabaseManager.getDatabase();
            const transaction = db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            
            // Try to find employee by ID or name
            let employee = await this.findEmployee(store, employeeId);
            
            if (!employee) {
                return {
                    success: false,
                    message: 'Employee not found'
                };
            }

            // Check if employee has a password hash
            if (!employee.passwordHash || !employee.passwordSalt) {
                return {
                    success: false,
                    message: 'No password set for this employee. Please contact admin.'
                };
            }

            // Verify password
            const isValid = await this.verifyPassword(
                password,
                employee.passwordHash,
                employee.passwordSalt
            );

            if (!isValid) {
                return {
                    success: false,
                    message: 'Incorrect password'
                };
            }

            // Create session
            SessionManager.createSession(employee.id, employee.name, false);

            return {
                success: true,
                message: 'Login successful',
                employee: {
                    id: employee.id,
                    name: employee.name
                }
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    },

    /**
     * Helper to find employee by ID or name
     * @param {IDBObjectStore} store - Employee object store
     * @param {string} identifier - Employee ID or name
     * @returns {Promise<Object|null>} Employee object or null
     */
    async findEmployee(store, identifier) {
        return new Promise((resolve, reject) => {
            // First try to get by ID
            const getRequest = store.get(identifier);
            
            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    resolve(getRequest.result);
                } else {
                    // Try to find by name
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => {
                        const employees = getAllRequest.result;
                        const employee = employees.find(emp => 
                            emp.name && emp.name.toLowerCase() === identifier.toLowerCase()
                        );
                        resolve(employee || null);
                    };
                    getAllRequest.onerror = () => reject(getAllRequest.error);
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    /**
     * Logout current user
     */
    logout() {
        SessionManager.clearSession();
        // Redirect to login page
        window.location.href = '/login.html';
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is logged in
     */
    isAuthenticated() {
        return SessionManager.isSessionValid();
    },

    /**
     * Check if current user is owner/admin
     * @returns {boolean} True if user is owner
     */
    isOwner() {
        return SessionManager.isOwner();
    },

    /**
     * Get current user info
     * @returns {Object|null} Current user session or null
     */
    getCurrentUser() {
        return SessionManager.getSession();
    },

    /**
     * Set password for an employee (admin function)
     * @param {string} employeeId - Employee ID
     * @param {string} newPassword - New password to set
     * @returns {Promise<Object>} Result with success status
     */
    async setEmployeePassword(employeeId, newPassword) {
        try {
            // Only owner can set passwords
            if (!this.isOwner()) {
                return {
                    success: false,
                    message: 'Only admin can set employee passwords'
                };
            }

            if (!newPassword || newPassword.length < 4) {
                return {
                    success: false,
                    message: 'Password must be at least 4 characters'
                };
            }

            // Hash the password
            const { hash, salt } = await this.hashPassword(newPassword);

            // Update employee in database
            const db = await DatabaseManager.getDatabase();
            const transaction = db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            
            const employee = await new Promise((resolve, reject) => {
                const request = store.get(employeeId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!employee) {
                return {
                    success: false,
                    message: 'Employee not found'
                };
            }

            // Update employee with password hash
            employee.passwordHash = hash;
            employee.passwordSalt = salt;

            await new Promise((resolve, reject) => {
                const request = store.put(employee);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            return {
                success: true,
                message: 'Password set successfully'
            };
        } catch (error) {
            console.error('Error setting password:', error);
            return {
                success: false,
                message: 'Failed to set password'
            };
        }
    }
};
