# Dynamic Order Creation Screen — Salesforce LWC

A Salesforce Lightning Web Component that allows sales users to create customer orders
from a single screen — selecting products by category, managing line items, and
saving Order + Order Item records in one transaction.

---

## Demo Video
[Watch the demo here → ]

---

## Features

- Dynamic **Product Category** dropdown (fetched live from database)
- Products filter automatically when a category is selected
- **Search products** by name within a category
- Add products as **line items** — duplicate products auto-increment quantity
- **Inline quantity editing** in the order items table
- Live calculation of **Line Total** and **Grand Total**
- Remove individual line items or **Clear All**
- Full **client-side + server-side validation**
- **Toast notifications** for every action (add, update, remove, error, success)
- **Loading spinners** during all API calls
- Creates **Order + Order Items** in a single server-side transaction with rollback
- **Success screen** showing the created Order ID

---

## Objects & Fields Created

### 1. Product_Category__c
| Field Label     | Field API Name   | Type       | Required |
|-----------------|------------------|------------|----------|
| Category Name   | Name             | Text       | Yes      |
| Active          | Active__c        | Checkbox   | Yes      |

### 2. Custom_Product__c
| Field Label      | Field API Name        | Type                         | Required |
|------------------|-----------------------|------------------------------|----------|
| Product Name     | Name                  | Text                         | Yes      |
| Product Category | Product_Category__c   | Lookup → Product_Category__c | Yes      |
| Unit Price       | Unit_Price__c         | Currency                     | Yes      |
| Active           | Active__c             | Checkbox                     | Yes      |

### 3. Custom_Order__c
| Field Label    | Field API Name   | Type      | Required |
|----------------|------------------|-----------|----------|
| Customer Name  | Customer_Name__c | Text      | Yes      |
| Order Date     | Order_Date__c    | Date      | Yes      |
| Total Amount   | Total_Amount__c  | Currency  | No       |
| Status         | Status__c        | Picklist  | No       |

Status__c Picklist Values: `Draft`, `Confirmed`, `Cancelled`

### 4. Order_Item__c
| Field Label  | Field API Name   | Type                        | Required |
|--------------|------------------|-----------------------------|----------|
| Order        | Custom_Order__c  | Master-Detail → Custom_Order__c | Yes  |
| Product      | Custom_Product__c| Lookup → Custom_Product__c  | Yes      |
| Quantity     | Quantity__c      | Number(18, 0)               | Yes      |
| Unit Price   | Unit_Price__c    | Currency                    | Yes      |
| Line Total   | Line_Total__c    | Formula (Currency)          | Auto     |

Line_Total__c Formula: `Quantity__c * Unit_Price__c`

---

## File Structure

```
├── CustomOrderCreationController.cls   ← Apex controller
├── orderCreationScreen.html            ← LWC template
├── orderCreationScreen.js              ← LWC controller
├── orderCreationScreen.css             ← Component styles
└── README.md
```

---

## How to Set Up

### Step 1 — Create a Salesforce Developer Org
Go to https://developer.salesforce.com/signup and sign up for free.

### Step 2 — Create Custom Objects
Go to **Setup → Object Manager** and create these 4 objects with fields as listed above:
- Product_Category__c
- Custom_Product__c
- Custom_Order__c
- Order_Item__c

### Step 3 — Add Sample Data
Go to App Launcher and create:
- 3-4 Product Category records (e.g. Electronics, Furniture, Stationery)
- 8-10 Product records linked to those categories with Unit Price values

### Step 4 — Create the Apex Class
Go to **Setup → Developer Console → File → New → Apex Class**
- Name it: `CustomOrderCreationController`
- Copy the code from `CustomOrderCreationController.cls` in this repo
- Save (Ctrl+S)

### Step 5 — Create the LWC Component
In Developer Console → **File → New → Lightning Web Component**
- Name it: `orderCreationScreen`
- Copy code from each file in this repo into the matching tab (HTML, JS, CSS)
- Save each file (Ctrl+S)

### Step 6 — Add Component to a Page
- Go to **Setup → Lightning App Builder → New → App Page**
- Name it: `Order Creation`
- Select **One Region** layout
- Drag **orderCreationScreen** component onto the page
- Click **Save → Activate → Add lightning app/mobile app → Save**

### Step 7 — Test
- Go to App Launcher → search `Order Creation` → open it
- Select a category, add products, fill details, click Create Order
- Verify Order and Order Items are created in the org

---

## Functional Requirements Covered

1. ✅ Product Category dropdown — fetched dynamically
2. ✅ Only active categories shown
3. ✅ Products load when category is selected
4. ✅ Add one or more products
5. ✅ Enter quantity per product
6. ✅ Line Total = Quantity × Unit Price
7. ✅ Grand Total = Sum of all line totals
8. ✅ Remove individual line items
9. ✅ Add products from multiple categories
10. ✅ Creates one Order + multiple Order Items
11. ✅ Success message after order creation

---

## Validations Covered

- ✅ Customer name is mandatory
- ✅ At least one product must be added
- ✅ Quantity must be greater than 0
- ✅ Duplicate products update quantity instead of adding duplicate row
- ✅ Inactive categories and products are not shown
- ✅ Order not created if total is zero
- ✅ All validations on both client side (JS) and server side (Apex)

---

## Bonus Features Covered

- ✅ Search product by name
- ✅ Inline quantity editing
- ✅ Loading spinners
- ✅ Toast messages for every action
- ✅ Server-side validation
- ✅ Bulk insert for order items (single DML)
- ✅ Duplicate product prevention
- ✅ Proper exception handling with rollback

---

## Technical Highlights

- `@wire` for categories — cached, loads once automatically
- Imperative Apex for products — fresh call on every category change
- `JSON.stringify` for passing line items — reliable deserialization
- `with sharing` — respects org-level security rules
- Single bulk `insert` DML for all Order Items — governor limit friendly
- Rollback on failure — if Order Items fail, Order is deleted too

---

## Author
Built as part of a Salesforce Developer Interview Assessment.