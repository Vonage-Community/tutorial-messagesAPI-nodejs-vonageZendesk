require('dotenv').config()
const axios = require("axios").default

const ZENDESK_CREDENTIALS = process.env.ZENDESK_CREDENTIALS
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN
const LOCAL_API_TOKEN = process.env.LOCAL_API_TOKEN
const LOCALTUNNEL_SUBDOMAIN = process.env.LOCALTUNNEL_SUBDOMAIN

if (!ZENDESK_CREDENTIALS) {
    console.error("No ZENDESK_CREDENTIALS provided in .env file.")
    process.exit()
}

if (!ZENDESK_SUBDOMAIN) {
    console.error("No ZENDESK_SUBDOMAIN provided in .env file.")
    process.exit()
}

if (!LOCAL_API_TOKEN) {
    console.error("No LOCAL_API_TOKEN provided in .env file.")
    process.exit()
}

if (!LOCALTUNNEL_SUBDOMAIN) {
    console.error("No LOCALTUNNEL_SUBDOMAIN provided in .env file.")
    process.exit()
}

// create a zendesk webhook
const webhookData = {
    webhook: {
        name: "Get ticket update",
        description: "This will inform the Vonage Zendesk Middleware about ticket updates.",
        status: "active",
        subscriptions: ["conditional_ticket_events"],
        endpoint: `https://${LOCALTUNNEL_SUBDOMAIN}.loca.lt/getTicketUpdate`,
        http_method: "POST",
        request_format: "json",
        authentication: {
            type: "bearer_token",
            add_position: "header",
            data: {
                token: `${LOCAL_API_TOKEN}`
            }
        }
    }
}

const options = {
    auth: {
        username: `${ZENDESK_CREDENTIALS.split("/")[0]}/token`,
        password: `${ZENDESK_CREDENTIALS.split("/")[1].replace("token:", "")}`
    },
    headers: {
        "Content-Type": "application/json"
    }
}

let webhookId
axios.post(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/webhooks`, JSON.stringify(webhookData), options).then(res => {
    console.log(`Webhook creation response: (${res.status}) ${JSON.stringify(res.data)}`)
    webhookId = res.data.webhook.id

    // after webhook is created, we want to create a trigger that links to it
    const triggerData = {
        trigger: {
            "title": "Notify on Ticket update via Whatsapp",
            "description": "Send a Whatsapp message via Vonage Middleware to the requester, including the latest comment on the ticket.",
            "active": true,
            "actions": [
                {
                    "field": "notification_webhook",
                    "value": [
                        `${webhookId}`,
                        "{\n\t\"ticketId\": \"{{ticket.id}}\",\n\t\"ticketTitle\": \"{{ticket.title}}\",\n\t\"comment\": \"{{ticket.latest_comment}}\",\n\t\"requesterName\": \"{{ticket.requester.name}}\",\n\t\"requesterPhone\": \"{{ticket.requester.phone}}\",\n\t\"priority\": \"{{ticket.priority}}\",\n    \"status\": \"{{ticket.status}}\",\n\t\"tags\": \"{{ticket.tags}}\"\n}"
                    ]
                }
            ],
            "conditions": {
                "all": [
                    { "field": "update_type", "operator": "is", "value": "Change" },
                    { "field": "comment_is_public", "operator": "is", "value": "true" }
                ],
            },
        }
    }

    axios.post(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/triggers`, JSON.stringify(triggerData), options).then(res => {
        console.log(`Trigger creation response: (${res.status}) ${JSON.stringify(res.data)}`)
    }).catch(e => {
        console.error(`Trigger creation error: ${e}\n${JSON.stringify(e?.response?.data)}`)
    })
}).catch(e => {
    console.error(`Webhook creation error: ${e}\n${JSON.stringify(e?.response?.data)}`)
})