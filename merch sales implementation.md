# Merch sales page implementation
I would like to make sales page or merch page that like a e-commerce. This merch database can be added and updated by event organizer or admin.
So each admin/event organizer could sell any merch on this app. What you need to build are:

## Dashboard for stocks and items for every admin
1. Admin could add, update, delete, disable, enable items that want to sell.
2. Each item could have up to 10 photos for users to be slide, you can replicate how shopee and tokopedia show images in their details e-commerce item.
3. Item have field: name, description, price, stock of items, options (need to be detailed beneath)
    3 a. Options are multi level addition. For example, I want to have color options, so admin can add color options, and add the options like "Red", "Blue", "Green". Also admin can add other options like sizes, for example, S, M, L, XL, etc. So, bsically each item could have multiple options, and this multiple options could be having different prices like how shopee and tokopedia works.
4. Admin could see the buyers details, who are buying, and get email notification from system if there's a buyer buy the merch.
5. If you want to ask something about this admin dashboard, just let me know. Please improve with my permissions.

## Dashboard for super admin
1. Super admin can create categories of merch, so this category could be use by each admin to categorized their products.
2. Guard categories if the category are having products, it cannot be deleted if products are exists with this category.
3. Super admin could see how many products in each category are. (table)

## Display pages on the landing page.
1. Everyone could see and search merch, you can implement semantic and fuzzy searh for this.
2. It has infinite scroll with pagination. Please implement such things.
3. User could filter by category.
4. User could filter by price range.
5. User could add to cart like how tokopedia and shopee works. Each item could have multiple items, so we can add 1 item to cart with different options even though it is the same product item.
6. User could checkout and will be direct to payment page, how to pay. User could upload the payment proof like how tickets is. And if user/buyer click confirm has paid, it will notify the seller through email and in web notification.

## Implement notifications on the app
1. Please implement notification for tickets sold, buy tickets in the app to admin and event organizer.
1 a. You could implement top right notificaiton logo that will be like dropdown if there's new buyer on the ticket or merch/products.