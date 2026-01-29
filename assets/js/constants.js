/**
 * Application Constants
 */

(function() {
    'use strict';

    window.CONSTANTS = {
        // App Info
        APP_NAME: 'MimiPro',
        APP_VERSION: '1.0.0',
        
        // Database
        DB_NAME: 'MimiProDB',
        DB_VERSION: 1,
        
        // Employee Roles
        EMPLOYEE_ROLES: {
            DELIVERYMAN: 'deliveryman',
            HELPER: 'helper'
        },
        
        // Salary Types
        SALARY_TYPES: {
            DAILY: 'daily',
            MONTHLY: 'monthly'
        },
        
        // Attendance Status
        ATTENDANCE_STATUS: {
            PRESENT: 'present',
            ABSENT: 'absent'
        },
        
        // Currency
        CURRENCY_SYMBOL: '৳',
        CURRENCY_CODE: 'BDT',
        
        // Date Formats
        DATE_FORMAT: 'DD/MM/YYYY',
        DATE_FORMAT_DISPLAY: 'en-GB',
        
        // Pagination
        DEFAULT_PAGE_SIZE: 20,
        
        // Cash Notes (in BDT)
        CASH_NOTES: [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
        
        // Colors
        COLORS: {
            PRIMARY: '#5B5FED',
            SECONDARY: '#6c757d',
            SUCCESS: '#28a745',
            DANGER: '#dc3545',
            WARNING: '#ffc107',
            INFO: '#17a2b8'
        }
    };

})();
