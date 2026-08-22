## Overview
Please learn this repository on how merch checkout works.
Currently, we don't have additional cost for shipping rate. Also, for every admin we don't have shipping departure address. Please implementat shipping cost for checkout out like standard e-commerce have.

## Requirements
We need every admin or event organizer shipping departure address. So, please make it to fill this data is mandatory if you want to sell merch. The address API for Indonesia region is this:

API Key: r8WbH4PMOi93JS88IbIYF7IIHmRkPxRxUoKrvTQahLdf3Cs4VZ
and the API collection is: https://documenter.getpostman.com/view/50289783/2sBXVZouWf

Please implement address based on that API to save the address both for buyer and seller (event organizer) that sells merch.

====

## Checking cost implementation
For this, you can use this collection: https://documenter.getpostman.com/view/50289783/2sBXVZpuek
We do have some of expedition company. Please list all on the options on the checkout page.
Please explore the API to utilize it correctly to calculate the shipping cost in the checkout.

Make sure both seller and buyer have correct address based on the first API collection.

Notes:
1. I think it would be better if we stored the address on our database side after retrieving the address list. Maybe something like time window cache or similar way. Because both API collection has credit limit like the Image 1 I attached.
