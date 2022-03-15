# VonageZendesk
# tutorial-messagesAPI-nodejs-vonageZendesk
Objective: tutorial to demo 2 way messages with zendesk ticket
## Prerequisites on Vonage Dashboard

1. [Sign up for a Vonage Account](https://dashboard.nexmo.com)
2. [Buy a Vonage LVN](https://dashboard.nexmo.com/buy-numbers) from the dashboard
3. [Complete our Whatsapp onboarding](https://dashboard.nexmo.com/messages/social-channels) (if your chosen channel is WhatsApp) 
4. [Create a Vonage application](https://dashboard.nexmo.com/applications) in the dashboard
5. Configure your applications webhooks to the following, where **{LOCALTUNNEL_SUBDOMAIN}** is the subdomain you entered in your .env file:
   - Inbound URL: `https://{LOCALTUNNEL_SUBDOMAIN}.loca.lt/inboundMessage`
   - Status URL: `https://{LOCALTUNNEL_SUBDOMAIN}.loca.lt/status`
6. Generate a private key from the applications settings, then put the private.key file into the root folder of this project


## Prerequisites on Zendesk

1. Sign up for an account on [Zendesk](https://zendesk.com)
2. Add a new webhook in Zendesk under `https://{YOUR_ZENDESK_SUBDOMAIN}.zendesk.com/admin/apps-integrations/webhooks/webhooks`
   - Set **Name**: `Get ticket update`
   - Set **Endpoint URL**: `https://{LOCALTUNNEL_SUBDOMAIN}.loca.lt/getTicketUpdate`
   - Set **Request method**: `POST`
   - Set **Authentication Method**: `Bearer`
   - Set **Token**: `{LOCAL_API_TOKEN}` where {LOCAL_API_TOKEN} is the value you put in your .env file
3. Configure triggers and automations (as required by the use case)
   - Go to `https://{YOUR_ZENDESK_SUBDOMAIN}.zendesk.com/admin/objects-rules/rules/triggers` and add a new trigger
   - Set **Trigger Name**: `Notify on Ticket update via Whatsapp`
   - Set **Category**: `Notifications`
   - Set **Conditions**: `Ticket is Updated` AND `Comment is Public`
   - Select **Action**: `notify Active Webhook` and select your previously created webhook for `Get Ticket update`
   - Set **JSON body** to the following and save:
   - ```
        {
            "ticketId": "{{ticket.id}}",
            "ticketTitle": "{{ticket.title}}",
            "comment": "{{ticket.latest_comment}}",
            "requesterName": "{{ticket.requester.name}}",
            "requesterPhone": "{{ticket.requester.phone}}",
            "priority": "{{ticket.priority}}",
            "status": "{{ticket.status}}",
            "tags": "{{ticket.tags}}"
        }

If you need more help, check out: [How to create webhooks in Zendesk](https://support.zendesk.com/hc/en-us/articles/4408839108378-Creating-webhooks-in-Admin-Center)


## Whatsapp Preapration

1. Open your Facebook [Whatsapp Manager](https://business.facebook.com/wa/manage/message-templates/)
2. Click the **Namespace** button on the top and copy the value to your .env file to fill the value for `VONAGE_WHATSAPP_NAMESPACE`
3. Create a new Message Template with the following:
   - Type: `Issue Resolution`
   - Name: `helpdesk_issue_update`
   - Language: `English`
4. Select the **Text** dropdown under **Header** and fill in the text: `Your {{1}} was updated`
5. Fill the body text with: `*Message:* {{1}}`
6. Fill out the samples and submit the message template, wait until it is approved (green bubble)

## Start Testing
1. Copy sample .env file with `cp .env.example .env` and fill in all variables in your new .env file
2. Run `npm i`
3. To start, run `npm start`
4. Send a message over SMS or WhatsApp to your VONAGE_WHATSAPP_NUMBER
5. Ticket gets created on zendesk
6. Add a comment on the ticket on Zendesk
7. Receive back an SMS or a WhatsApp message that ticket has been updated with the added comment
