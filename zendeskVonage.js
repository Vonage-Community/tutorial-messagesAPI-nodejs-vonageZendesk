require('dotenv').config()
const Vonage = require('@vonage/server-sdk')
var express = require('express')
const https = require('https')
const localtunnel = require('localtunnel')

const PORT = process.env.PORT || 3000
const DEBUG = process.env.DEBUG || false

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH,
}, { debug: DEBUG })

const VONAGE_WHATSAPP_NUMBER = process.env.VONAGE_WHATSAPP_NUMBER
const VONAGE_WHATSAPP_NAMESPACE = process.env.VONAGE_WHATSAPP_NAMESPACE
const VONAGE_WHATSAPP_TICKET_TEMPLATE_NAME = process.env.VONAGE_WHATSAPP_TICKET_TEMPLATE_NAME

const ZENDESK_CREDENTIALS = process.env.ZENDESK_CREDENTIALS
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN
const ZENDESK_DEFAULT_PRIORITY = process.env.ZENDESK_DEFAULT_PRIORITY || "urgent"

const app = express()
app.use(express.json())

//Inbound messages webhook added in Vonage nexmo dashbaord creates a ticekt in Zendesk
app.post('/inboundMessage', (req, res) => {
  const { profile, text, from } = req.body
  const requesterName = profile.name
  createZendeskTicket(text, from, requesterName);
  res.json(200);
})

//Send outbound message using Vonage Vonage APIs
function sendMessage(zendeskRequesterNumber, message, isTemplateMessage) {
  //channel could be set to 'sms' or 'whatsapp'
  const channel = "whatsapp";

  // check if message is template or text and prepare accordingly
  const sendableMessage = isTemplateMessage ? { message_type: "custom", custom: message } : { message_type: "text", text: message }

  const data = JSON.stringify({
    from: VONAGE_WHATSAPP_NUMBER,
    to: zendeskRequesterNumber,
    channel,
    ...sendableMessage
  })

  // use vonage sdk to generate JWT token
  const JWT = vonage.credentials.generateJwt()

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + JWT
    }
  }

  const req = https.request("https://api.nexmo.com/v1/messages", options, res => {
    console.log(`statusCode: ${res.statusCode}`)
  })

  req.on('error', error => {
    console.log("error here");
    console.error(error)
  })

  req.write(data)
  req.end()
}

// Zendesk ticket update webhook sends an outbound message back to the user
app.post('/getTicketUpdate', (req, res) => {
  const { requesterPhone: zendeskRequesterPhone, requesterName: zendeskRequesterName, comment: zendeskComment, ticketId: zendeskTicketId, ticketTitle: zendeskTicketTitle } = req.body
  const isTemplateMessage = (VONAGE_WHATSAPP_NAMESPACE && VONAGE_WHATSAPP_TICKET_TEMPLATE_NAME && !zendeskComment.includes("\n")) ? true : false
  // if template data is filled, use templates to send; otherwise use plain text message
  const message = isTemplateMessage ? {
    type: "template",
    template: {
      namespace: VONAGE_WHATSAPP_NAMESPACE,
      name: VONAGE_WHATSAPP_TICKET_TEMPLATE_NAME,
      language: {
        policy: "deterministic",
        code: "en"
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "text",
              text: `Zendesk Ticket #${zendeskTicketId}`
            }
          ]
        },
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: `${zendeskComment.replaceAll("\n", " ")}`
            },
          ]
        },
      ]
    }
  } : `Your Zendesk Ticket *${zendeskTicketTitle}* with reference number *${zendeskTicketId}* has been updated with the following comment:\n\n${zendeskComment}`;
  sendMessage(zendeskRequesterPhone, message, isTemplateMessage);
  res.json(200);
});


function createZendeskTicket(text, from, name) {
  // below object ticket is only for demo purpose
  const data = JSON.stringify({
    ticket: {
      comment: {
        body: `${text}`
      },
      priority: ZENDESK_DEFAULT_PRIORITY,
      subject: `Whatsapp request: ${text.substr(0, 20)}...`,
      requester: {
        name,
        phone: from
      }
    }
  })

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(ZENDESK_CREDENTIALS).toString("base64")
    }
  }

  const req = https.request(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets.json`, options, res => {
    console.log(`statusCode: ${res.statusCode}`)
  })

  req.on('error', error => {
    console.log("error here");
    console.error(error)
  })

  req.write(data)
  req.end()
}

let tunnel;
app.listen(PORT, () => {
  console.log(`Hello world app listening on port ${PORT}! Starting localtunnel...`)
  tunnel = localtunnel(PORT, { subdomain: 'zendesk' }, (err, tunnel) => {
    console.log(`Established localtunnel at ${tunnel.url}.`)
  })
  tunnel.on('error', function (err) {
    // When the tunnel is erroring out
    console.error(err)
  })
  tunnel.on('close', function () {
    // When the tunnel is closed
    console.warn("Localtunnel closed.")
  })
})

app.on('close', () => {
  console.log("Closing localtunnel...")
  tunnel.close()
})

process.on('SIGINT', function () {
  console.log("Closing localtunnel...")
  tunnel.close()
  process.exit()
});
