# VonageZendesk
# tutorial-messagesAPI-nodejs-vonageZendesk
Objective: tutorial to demo 2 way messages with zendesk ticket

Prerequisites on Vonage nexmo dashboard:
1. Sign up for vonage nexmo account 
2. Complete WA onboarding (if chosen channel is WhatsApp) 
3. Create vonage application
4. Configure webhooks
5. Get JWT 


Prerequisites on Zendesk:
1. Sign up for an account on zendesk
2. Add webhook(s)
3. Configure triggers and automations (as required by the use case)

How to create webhooks in Zendesk
https://support.zendesk.com/hc/en-us/articles/4408839108378-Creating-webhooks-in-Admin-Center

Start testing:
1. Add variables in .env file
2. Run zendeskVonage.js 
3. Send a message over SMS or WhatsApp
4. Ticket gets created on zendesk
5. Add a comment on the ticket on Zendesk
6. Receive back an SMS or a WhatsApp message that ticket has been updated with the added comment
