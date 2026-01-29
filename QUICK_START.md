# MimiPro Admin - Quick Start Guide

## 🚀 Getting Started

### 1. Open the Application
Simply open `index.html` in a modern web browser or Android WebView.

```bash
# For local development
# Just double-click index.html or use a local server
```

### 2. First Launch
On first launch, the app will:
- ✅ Initialize IndexedDB database
- ✅ Create required stores
- ✅ Add sample products
- ✅ Add sample employees
- ✅ Load the dashboard

### 3. Navigate to Delivery Page
Click on "Delivery" in the bottom navigation to access the delivery calculation module.

## 📦 Using Delivery Module

### Step 1: Add Products
1. Click **"+ Add Product"** button
2. A new row will appear in the table
3. Select a product from the dropdown

### Step 2: Enter Delivery Data
For each product, enter:
- **DC (Delivery Carton)**: Number of cartons delivered
- **DP (Delivery Pieces)**: Additional pieces delivered
- **RC (Return Carton)**: Number of cartons returned
- **RP (Return Pieces)**: Additional pieces returned

The **Sold** quantity calculates automatically:
```
Sold = (DC × Pieces/Carton + DP) - (RC × Pieces/Carton + RP)
```

### Step 3: Enter Price
The price auto-fills from the product database, but you can adjust if needed.

### Step 4: Track Cash Received
Scroll to **Cash Denominations** section:
1. Enter the quantity for each note denomination
2. Total cash calculates automatically

### Step 5: Add Expenses
Click **"+ Add Expense"** to record any delivery expenses:
1. Enter expense name (e.g., "Fuel", "Tea")
2. Enter amount
3. Click **Save**

You can add multiple expenses.

### Step 6: Review Summary
The summary shows:
- **Sales Total**: Total value of products sold
- **Cash Total**: Cash received
- **Total Expenses**: Sum of all expenses
- **Net Total**: Sales - Cash - Expenses

### Step 7: Save
Click **"Save Calculation"** button:
1. Enter customer name when prompted
2. Data saves to database
3. Form clears for next entry

## 📱 Mobile Features

### Swipe to Delete
On touch devices, swipe left on any row to delete it:
1. Touch and hold on a row
2. Swipe left
3. Confirm deletion

## 🎯 Tips & Tricks

### Quick Entry
1. Use Tab key to move between fields
2. Price auto-fills when product selected
3. All calculations happen in real-time

### Edit Before Saving
You can freely modify any field before saving. Changes are not persisted until you click "Save Calculation".

### Clear Form
If you want to start over, simply refresh the page.

### View History
(To be implemented - will show all saved calculations)

## ⚡ Keyboard Shortcuts

- **Tab**: Move to next field
- **Enter**: Submit modal forms
- **Escape**: Close modals (if implemented)

## 🔧 Sample Data

### Sample Products Included
1. Coca Cola 250ml - 24 pcs/carton - ৳20/pc
2. Pepsi 250ml - 24 pcs/carton - ৳20/pc
3. Sprite 250ml - 24 pcs/carton - ৳20/pc
4. Fanta 250ml - 24 pcs/carton - ৳20/pc
5. Mountain Dew 250ml - 24 pcs/carton - ৳22/pc

### Sample Employees
1. Mohammad Ali - Deliveryman - ৳500/day
2. Karim Rahman - Helper - ৳350/day

## 📊 Example Calculation

**Scenario:** Delivered 5 cartons of Coca Cola, returned 1 carton

**Input:**
- Product: Coca Cola 250ml
- DC: 5
- DP: 0
- RC: 1
- RP: 0
- Price: ৳20

**Calculation:**
- Delivered: 5 × 24 + 0 = 120 pieces
- Returned: 1 × 24 + 0 = 24 pieces
- Sold: 120 - 24 = 96 pieces
- Total: 96 × ৳20 = ৳1,920

## 🐛 Troubleshooting

### Products not showing in dropdown?
- Check browser console for errors
- Refresh the page
- Check if database initialized (F12 → Application → IndexedDB)

### Calculations not updating?
- Make sure you're entering numbers, not text
- Check that product is selected
- Refresh page if issue persists

### Can't save data?
- Ensure customer name is entered
- Check if at least one product row has data
- Check browser console for errors

### Page won't load?
- Clear browser cache
- Make sure all files are present
- Check browser console for missing file errors

## 🎨 Customization

### Add Your Products
Products can be added via database (DevTools) or product management page (coming soon).

### Modify Cash Notes
Edit `CASH_NOTES` array in constants.js or delivery.js to customize denominations.

### Change Colors
Edit `assets/css/base.css` and `components.css` to customize colors and theme.

## 📱 Android WebView

To use in Android WebView:
1. Place all files in assets folder
2. Load index.html in WebView
3. Enable JavaScript
4. Enable DOM storage for IndexedDB

```java
WebView webView = findViewById(R.id.webview);
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true);
webView.loadUrl("file:///android_asset/index.html");
```

## 🔐 Data Storage

All data is stored locally in browser's IndexedDB:
- No internet required
- Data persists across sessions
- Stored on device only
- No automatic cloud backup

## 🔄 Updates

To update the app:
1. Replace files with new versions
2. Hard refresh browser (Ctrl+F5)
3. Database structure automatically upgrades if needed

## 📞 Support

For issues:
1. Check INTEGRATION_GUIDE.md for detailed documentation
2. Review browser console for error messages
3. Check that all files are present and properly linked

---

**Happy Calculating! 🎉**

For detailed technical documentation, see [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
