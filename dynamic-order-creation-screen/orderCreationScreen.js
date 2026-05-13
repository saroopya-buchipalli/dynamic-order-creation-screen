import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCategories from '@salesforce/apex/CustomOrderCreationController.getCategories';
import getProductsByCategory from '@salesforce/apex/CustomOrderCreationController.getProductsByCategory';
import createOrder from '@salesforce/apex/CustomOrderCreationController.createOrder';

const COLUMNS = [
    { label: '#',             fieldName: 'index',    type: 'number',  initialWidth: 60 },
    { label: 'Product',       fieldName: 'name',     type: 'text' },
    { label: 'Category',      fieldName: 'category', type: 'text' },
    {
        label: 'Unit Price (₹)',
        fieldName: 'unitPrice',
        type: 'currency',
        typeAttributes: { currencyCode: 'INR', minimumFractionDigits: 2 }
    },
    {
        label: 'Qty',
        fieldName: 'quantity',
        type: 'number',
        editable: true,
        initialWidth: 100,
        cellAttributes: { alignment: 'center' }
    },
    {
        label: 'Line Total (₹)',
        fieldName: 'lineTotal',
        type: 'currency',
        typeAttributes: { currencyCode: 'INR', minimumFractionDigits: 2 }
    },
    {
        type: 'button-icon',
        initialWidth: 60,
        typeAttributes: {
            iconName: 'utility:delete',
            name: 'delete',
            variant: 'bare',
            alternativeText: 'Remove'
        }
    }
];

export default class OrderCreationScreen extends LightningElement {
    @api title = 'Create Order';

    @track customerName      = '';
    @track orderDate         = new Date().toISOString().split('T')[0];
    @track orderRef          = '';
    @track selectedCategory  = '';
    @track searchQuery       = '';
    @track products          = [];
    @track isLoadingProducts = false;
    @track lineItems         = [];
    @track draftValues       = [];
    @track isLoading         = false;
    @track isSubmitted       = false;
    @track createdOrderId    = '';

    columns    = COLUMNS;
    categories = [];

    @wire(getCategories)
    wiredCategories({ data, error }) {
        if (data) {
            this.categories = data;
        } else if (error) {
            this.showToast('Error', 'Failed to load categories: ' + error.body.message, 'error');
        }
    }

    // ── Computed Properties ──────────────────────────────────────

    get categoryOptions() {
        return this.categories.map(c => ({
            label: c.Name,   // Product_Category__c uses standard Name field
            value: c.Id
        }));
    }

    get selectedCategoryName() {
        const cat = this.categories.find(c => c.Id === this.selectedCategory);
        return cat ? cat.Name : '';
    }

    get filteredProducts() {
        const q = this.searchQuery.toLowerCase();
        const addedIds = new Set(this.lineItems.map(i => i.productId));
        return this.products
            .filter(p => !q || p.Name.toLowerCase().includes(q))
            .map(p => ({
                ...p,
                categoryName : this.selectedCategoryName,
                isAdded      : addedIds.has(p.Id),
                cardClass    : addedIds.has(p.Id)
                    ? 'slds-box slds-box_x-small slds-theme_shade'
                    : 'slds-box slds-box_x-small'
            }));
    }

    get hasFilteredProducts() { return this.filteredProducts.length > 0; }
    get showProducts()        { return this.selectedCategory !== '' && !this.isLoadingProducts; }
    get isCategoryEmpty()     { return this.selectedCategory === ''; }
    get hasLineItems()        { return this.lineItems.length > 0; }
    get lineItemCount()       { return this.lineItems.length; }

    get grandTotal() {
        const total = this.lineItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        return total.toFixed(2);
    }

    // ── Form Handlers ────────────────────────────────────────────

    handleCustomerName(e) { this.customerName = e.target.value; }
    handleOrderDate(e)    { this.orderDate    = e.target.value; }
    handleOrderRef(e)     { this.orderRef     = e.target.value; }
    handleSearch(e)       { this.searchQuery  = e.target.value; }

    // ── Category Change ──────────────────────────────────────────

    handleCategoryChange(e) {
        this.selectedCategory  = e.detail.value;
        this.searchQuery       = '';
        this.products          = [];
        this.isLoadingProducts = true;

        getProductsByCategory({ categoryId: this.selectedCategory })
            .then(data  => { this.products = data; })
            .catch(error => {
                this.showToast('Error', 'Failed to load products: ' + error.body.message, 'error');
            })
            .finally(() => { this.isLoadingProducts = false; });
    }

    // ── Add Product ──────────────────────────────────────────────

    handleAddProduct(e) {
        const { id, name, price, category } = e.currentTarget.dataset;
        const unitPrice = parseFloat(price);

        const existing = this.lineItems.find(i => i.productId === id);
        if (existing) {
            this.lineItems = this.lineItems.map(i => {
                if (i.productId === id) {
                    const newQty = i.quantity + 1;
                    return { ...i, quantity: newQty, lineTotal: newQty * i.unitPrice };
                }
                return i;
            });
            this.showToast('Updated', `${name} quantity increased`, 'info'); // FIX: was ${Name}
        } else {
            this.lineItems = [...this.lineItems, {
                productId : id,
                name      : name,
                category  : category,
                unitPrice : unitPrice,
                quantity  : 1,
                lineTotal : unitPrice,
                index     : this.lineItems.length + 1
            }];
            this.showToast('Added', `${name} added to order`, 'success'); // FIX: was ${Name}
        }
    }

    // ── Inline Qty Edit ──────────────────────────────────────────

handleQtyChange(e) {
    const updatedFields = e.detail.draftValues;
    console.log('draftValues:', JSON.stringify(updatedFields));
    
    let toastMessage = '';
    this.lineItems = this.lineItems.map(item => {
        const updated = updatedFields.find(u => u.productId === item.productId);
        if (updated) {
            const newQty = parseInt(updated.quantity, 10);
            toastMessage = `${item.name} quantity updated to ${newQty}`;
            return { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice };
        }
        return item;
    });
    this.draftValues = [];
    if (toastMessage) {
        this.showToast('Updated', toastMessage, 'success');
    }
}

    // ── Delete Row ───────────────────────────────────────────────

    handleRowAction(e) {
        if (e.detail.action.name === 'delete') {
            const productId = e.detail.row.productId;
            this.lineItems = this.lineItems
                .filter(i => i.productId !== productId)
                .map((i, idx) => ({ ...i, index: idx + 1 }));
            this.showToast('Removed', 'Product removed from order', 'info');
        }
    }

    // ── Clear All ────────────────────────────────────────────────

    handleClearAll() {
        this.lineItems   = [];
        this.draftValues = [];
        this.showToast('Cleared', 'All items removed', 'info');
    }

    // ── Create Order ─────────────────────────────────────────────

    handleCreateOrder() {
        if (!this.validate()) return;
        this.isLoading = true;

        const items = this.lineItems.map(i => ({
            productId : i.productId,
            quantity  : i.quantity,
            unitPrice : i.unitPrice
        }));

        createOrder({
            customerName : this.customerName,
            orderDate    : this.orderDate,
            orderRef     : this.orderRef,
            totalAmount  : parseFloat(this.grandTotal),
            itemsJson    : JSON.stringify(items)  // FIX: was items:items
        })
        .then(orderId => {
            this.createdOrderId = orderId;
            this.isSubmitted    = true;
            this.showToast('Success!', 'Order created! ID: ' + orderId, 'success');
        })
        .catch(error => {
            this.showToast('Error', error.body.message, 'error');
        })
        .finally(() => { this.isLoading = false; });
    }

    // ── Validation ───────────────────────────────────────────────

    validate() {
        if (!this.customerName.trim()) {
            this.showToast('Validation Error', 'Customer name is required.', 'warning');
            return false;
        }
        if (!this.orderDate) {
            this.showToast('Validation Error', 'Order date is required.', 'warning');
            return false;
        }
        if (this.lineItems.length === 0) {
            this.showToast('Validation Error', 'Please add at least one product.', 'warning');
            return false;
        }
        if (this.lineItems.some(i => !i.quantity || i.quantity < 1)) {
            this.showToast('Validation Error', 'All quantities must be at least 1.', 'warning');
            return false;
        }
        if (parseFloat(this.grandTotal) <= 0) {
            this.showToast('Validation Error', 'Order total cannot be zero.', 'warning');
            return false;
        }
        return true;
    }

    // ── Reset ────────────────────────────────────────────────────

    handleReset() {
        this.customerName     = '';
        this.orderDate        = new Date().toISOString().split('T')[0];
        this.orderRef         = '';
        this.selectedCategory = '';
        this.searchQuery      = '';
        this.products         = [];
        this.lineItems        = [];
        this.draftValues      = [];
        this.isSubmitted      = false;
        this.createdOrderId   = '';
    }

    // ── Toast ────────────────────────────────────────────────────

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}