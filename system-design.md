You are database system designer and business expert also expert in giving advice and improvement on the frontend especially on react and nextjs. 
I would like to create system for buying ticket in Indonesia.
The system for the frontend scaffolding are already built in this repo. You can see and learn it in this repo.
If you want to add something in the frontend, please feel free.

The feature that I want in this system are:
- System have 3 major role which are: Super Admin, Admin (event owner), and user (who are going to buy tickets on the platform)
- System could login through Oauth Google Sign in
- Whoever can buy ticket, user, super admin, admin and anyone that has not login yet to the platform, but for logged in one, the fields are prefilled.
- The event owner or you could say the 'admin' role is the one who create the event and ticket sales that would be listed on the platform/app.
  - Event owner ability:
    - Create event, event has fields: name, slug, description, category, status (draft, published, cancelled, completed), start date, end date, address, venue_name, city, province, country, meeting_url, platform (zoom, google meet, etc).
    - Deciding how many is the ticket are going to be sale or let say the stock of the tickets.
    - Deciding the price of the tickets
    - Input contact person of each event
    - create promo code for the event, the promo code could have expiration date, how many is the availability for the promo code to be used by the buyer.
    - See and manage who has been bought the tickets in the system for their own events.

## Flow and features that should be exists in the system are:
- Need email verification, so you need maybe email_verified_at column in the database. This is for preventing false email for sending the ticket to the buyers after purchase.
- Need maximum tickets purchase in every event for every user, the owner of the event or admin deciding it.
- Need bank account number input for payment. This is for event owner bank account number, it could be setup attached to the account. So, whenever the admin create event, it can be used or use different bank account on every event. It support multiple accounts, because it need to cover all of users bank account.
- Should be a toggle in admin dashboard to enable or disable event visibility.
- Should have a validity in every event, like the start date and end date validity.
- QR would be generated for every ticket purchase, so, if one user buy 5 tickets, it should generated 5 QR code.
- Admin can input multiple images for the event, but only one for the poster in the platform and it should have resolution for Instagram feed/story.
- User can directly purchase the ticket without logging in, but they need to input data like name, email and phone number manually unlike the logged in one, system will prefilled it.
- Ticket purchase only need one user data no matter how many they purchase, the system doesn't need each user data for each ticket.
- User can logged in using Sign in with google.
- Super admin can manage all of data, see and manage the buyers data, see and manage 'Admin' data in the dashboard.
- System should have dashboard for every role, 'Admin', 'Super Admin', 'User'. 
- User can see history of purchase, see the bought tickets

## Properties
- Ticket categories are:
  - Early bird
  - Pre sales
  - Regular
- Event Categories are:
  - Sports
  - Comedy
  - Game
  - Live Music
  - Concert
  - Community
- The ticket categories and event categories are managable by 'Super Admin' only in the dashboard, they can update, add, edit them.

What your tasks are:
- Create plan for database design for this system, you can ask many questions to me for tailor and make any improvement for this system
- Create .md files for system overview or business overview