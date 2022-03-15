# Vonage Messages API & Zendesk Tutorial

This tutorial is a demo for 2-way messaging from and to Zendesk tickets via Vonage Messaging API.

## 1. Installation

1. Copy the .env.example file with `cp .env.example .env` and fill in all variables in your new .env file. Read below or check the comments in the sample file to find the location of the values you need to enter.
2. Run `npm i`

## 2. Setup Vonage Dashboard

1. [Sign up for a Vonage Account](https://dashboard.nexmo.com)
2. [Buy a Vonage LVN](https://dashboard.nexmo.com/buy-numbers) from the dashboard
3. [Complete our Whatsapp onboarding](https://dashboard.nexmo.com/messages/social-channels) (if your chosen channel is WhatsApp) 
4. [Create a Vonage application](https://dashboard.nexmo.com/applications) in the dashboard
5. Configure your applications webhooks to the following, where **{LOCALTUNNEL_SUBDOMAIN}** is the subdomain you entered in your .env file:
   - Inbound URL: `https://{LOCALTUNNEL_SUBDOMAIN}.loca.lt/inboundMessage`
   - Status URL: `https://{LOCALTUNNEL_SUBDOMAIN}.loca.lt/status`
6. Generate a private key from the applications settings, then put the private.key file into the root folder of this project

## 3. Setup Zendesk

1. Sign up for an account on [Zendesk](https://zendesk.com)
2. Fill in your Zendesk Subdomain into the .env file under `ZENDESK_SUBDOMAIN`. (E.g. if your domain looks like https://yourcompany.zendesk.com, your need to fill in "yourcompany" as a value)
3. Go to Zendesk API Settings at `https://{ZENDESK_SUBDOMAIN}.zendesk.com/admin/apps-integrations/apis/zendesk-api/settings` and enable Token access and generate a token
4. Paste your Zendesk Administrator E-Mail and API Token into the .env file as `ZENDESK_CREDENTIALS` in the concatenated format `your@email.com/token:{YOUR_ZENDESK_TOKEN}`
5. Besides the already filled `ZENDESK_CREDENTIALS` and `ZENDESK_SUBDOMAIN`, now fill in at least the variables `LOCAL_API_TOKEN` and `LOCALTUNNEL_SUBDOMAIN` in your .env file. You can actually use any value you want to fill them.
6. Run `node setupZendesk.js`. This will setup your Zendesk Webhooks and Triggers needed to send and receive messages via Vonage.

## 4. Setup Whatsapp

1. Open your Facebook [Whatsapp Manager](https://business.facebook.com/wa/manage/message-templates/)
2. Click the **Namespace** button on the top and copy the value to your .env file to fill the value for `VONAGE_WHATSAPP_NAMESPACE`
3. Create a new Message Template with the following:
   - Type: `Issue Resolution`
   - Name: `helpdesk_issue_update`
   - Language: `English`
4. Select the **Text** dropdown under **Header** and fill in the text: `Your {{1}} was updated`
5. Fill the body text with: `*Message:* {{1}}`
6. Fill out the samples and submit the message template, wait until it is approved (green bubble)

## 5. Run it
1. To start, run `npm start`
2. Send a message over SMS or WhatsApp to your VONAGE_WHATSAPP_NUMBER
3. Ticket gets created on zendesk
4. Add a comment on the ticket on Zendesk
5. Receive back an SMS or a WhatsApp message that ticket has been updated with the added comment
