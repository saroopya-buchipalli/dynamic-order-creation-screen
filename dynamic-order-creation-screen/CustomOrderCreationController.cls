public with sharing class CustomOrderCreationController {

    @AuraEnabled(cacheable=true)
    public static List<Product_Category__c> getCategories() {
        return [
            SELECT Id, Name 
            FROM Product_Category__c 
            WHERE Active__c = true 
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Custom_Product__c> getProductsByCategory(Id categoryId) {
        return [
            SELECT Id, Name, Unit_Price__c 
            FROM Custom_Product__c 
            WHERE Product_Category__c = :categoryId 
            AND Active__c = true
        ];
    }

    @AuraEnabled
    public static String createOrder(
        String customerName, 
        Date orderDate, 
        String orderRef, 
        Decimal totalAmount,
        String itemsJson
    ) {
        // Server-side validation
        if (String.isBlank(customerName)) {
            throw new AuraHandledException('Customer name is required.');
        }
        if (String.isBlank(itemsJson)) {
            throw new AuraHandledException('At least one product must be added.');
        }
        if (totalAmount == null || totalAmount <= 0) {
            throw new AuraHandledException('Order total must be greater than zero.');
        }

        // Parse items from JSON
        List<Object> rawItems;
        try {
            rawItems = (List<Object>) JSON.deserializeUntyped(itemsJson);
        } catch(Exception e) {
            throw new AuraHandledException('Failed to read product data: ' + e.getMessage());
        }

        if (rawItems == null || rawItems.isEmpty()) {
            throw new AuraHandledException('At least one product must be added.');
        }

        // Step 1: Create the Order record first
        Custom_Order__c order;
        try {
            order = new Custom_Order__c(
                Customer_Name__c = customerName,
                Order_Date__c    = orderDate,
                Total_Amount__c  = totalAmount,
                Status__c        = 'Draft'
            );
            insert order;
        } catch(Exception e) {
            throw new AuraHandledException('Failed to create Order: ' + e.getMessage());
        }

        // Step 2: Create all Order Items in one bulk insert
        try {
            List<Order_Item__c> lineItems = new List<Order_Item__c>();
            for (Object rawItem : rawItems) {
                Map<String, Object> itemMap = (Map<String, Object>) rawItem;
                String  productId = (String)  itemMap.get('productId');
                Decimal quantity  = Decimal.valueOf(String.valueOf(itemMap.get('quantity')));
                Decimal unitPrice = Decimal.valueOf(String.valueOf(itemMap.get('unitPrice')));

                lineItems.add(new Order_Item__c(
                    Custom_Order__c   = order.Id,
                    Custom_Product__c = (Id) productId,
                    Quantity__c       = quantity,
                    Unit_Price__c     = unitPrice
                ));
            }
            insert lineItems;
        } catch(Exception e) {
            // Rollback: delete order if items fail
            delete order;
            throw new AuraHandledException('Failed to create Order Items: ' + e.getMessage());
        }

        return order.Id;
    }
}