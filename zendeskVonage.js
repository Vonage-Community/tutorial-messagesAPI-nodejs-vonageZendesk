require('dotenv').config()
const Vonage = require('@vonage/server-sdk')
var express = require('express')
const https = require('https')

const PORT = process.env.PORT || 3000
const DEBUG = process.env.DEBUG || false

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH,
}, { debug: DEBUG })

const VONAGE_WHATSAPP_NUMBER = process.env.VONAGE_WHATSAPP_NUMBER;

const ZENDESK_CREDENTIALS = process.env.ZENDESK_CREDENTIALS;
const ZENDESK_DOMAIN = process.env.ZENDESK_DOMAIN;

const app = express()
app.use(express.json())

//Inbound messages webhook added in Vonage nexmo dashbaord creates a ticekt in Zendesk
app.post('/inboundMessage', (req, res) => {
  var ticket_title = req.body.text;
  var toNumber = req.body.from;
  createZendeskTicket(ticket_title, toNumber);
  res.json(200);
})


//Send outbound message using Vonage Vonage APIs
function sendMessage(requesterNumber, message) {

  //channel could be set to 'sms' or 'whatsapp'
  var channel = "whatsapp";

  const data = JSON.stringify({
    "from": VONAGE_WHATSAPP_NUMBER,
    "to": requesterNumber,
    "message_type": "text",
    "text": message,
    "channel": channel
  })

  const JWT = vonage.credentials.generateJwt()

  const options = {
    hostname: 'api.nexmo.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + JWT
    }
  }

  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', d => {
      process.stdout.write(d)
    })
  })

  req.on('error', error => {
    console.log("error here");
    console.error(error)
  })

  req.write(data)
  req.end()
}

//Zendesk ticket update webhook sends an outbound message back to the user
app.post('/getTicketUpdate', (req, res) => {
  var requesterNumber = req.body.requester_name;
  var zendeskComment = req.body.comment;
  var message = "Ticket " + req.body.ticket_title + " with reference number: " + req.body.ticket_id +
    " has been updated with the following comment: " + zendeskComment;
  sendMessage(requesterNumber, message);
  res.json(200);
});


function createZendeskTicket(ticket_title, toNumber) {
  //below object ticket is only for demo purpose
  const data = JSON.stringify({
    "ticket": {
      "comment": {
        "body": "The smoke is very colorful."
      },
      "priority": "urgent",
      "subject": ticket_title,
      "requester": {
        "name": toNumber
      }
    }
  })

  const options = {
    hostname: ZENDESK_DOMAIN,
    port: 443,
    path: '/api/v2/tickets.json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + ZENDESK_CREDENTIALS
    }
  }

  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', d => {
      process.stdout.write(d)
    })
  })

  req.on('error', error => {
    console.log("error here");
    console.error(error)
  })

  req.write(data)
  req.end()
}

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
