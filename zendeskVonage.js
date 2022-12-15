require('dotenv').config()
const Vonage = require('@vonage/server-sdk')
var express = require('express')
const https = require('https')
const jwt = require("jsonwebtoken")
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

/*
1. Receive inbound message on WA
2. check a ticket is created under the same requestor and status open
3. If ticket is created:
	a. reply back on WA with status of the ticket
4. if no ticket is created, create one
5. when agent updates ticket, reply back on WA
*/


// status message webhook, just for monitoring
app.post('/status', (req, res) => {
  console.log(`Received status webhook:\n${req.body}`)
  res.json(200);
})

//Inbound messages webhook added in Vonage nexmo dashbaord creates a ticekt in Zendesk
app.post('/inboundMessage', (req, res) => {
	
 const vonageSignature = req.headers.authorization.split(" ")[1];
  console.log("vonageSignature: "+vonageSignature+" : "+process.env.VONAGE_SIGNATURE_SECRET);
  const decoded = jwt.verify(vonageSignature, process.env.VONAGE_SIGNATURE_SECRET, { algorithms: ['HS256'] })
  console.log(decoded)
  if (decoded.api_key !== process.env.VONAGE_API_KEY) {
    console.error("Invalid signature. This message does not come from Vonage.")
    res.sendStatus(200)
    return
  }
  console.log(`Received inbound message webhook for message ${req.body.message_uuid}.`)
  const { profile, text, from } = req.body
 // const requesterName = profile.name
  checkTicketCreated(text, from);
  res.sendStatus(200);
})

//Send outbound message using Vonage Vonage APIs
function sendMessage(zendeskRequesterNumber, message, isTemplateMessage, channel) {

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
      'Authorization': 'Bearer ' + JWT,
	'User-Agent': 'ZenDesk_v1',
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


//checkTicketCreated(req.body.from);
function checkTicketCreated(message,requester)
{
//endpoint from Zendesk to list ticket created by a user
	const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(ZENDESK_CREDENTIALS).toString("base64")
    }
  }

  const req = https.request(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=requester:${requester} status:open type:ticket`, options, res => {
    console.log(`statusCode: ${res.statusCode}`);
	   let data = '';
    res.on('data', (chunk) => {
        data = data + chunk.toString();
    });
  
    res.on('end', () => {
        const body = JSON.parse(data);
		 req.end()
		ticketsCreated=body.count;
		ticketsCreated==0?createZendeskTicket(message, requester):getCreatedTicket(body,requester);
	
		
    });
  })
  

  req.on('error', error => {
    console.log("error here");
    console.error(error)
  })
  req.end()
}

function getCreatedTicket(ticket,requester){
	const message=`I can see that there's a ticket created with subject: *${ticket.results[0].subject}* and it's currently *${ticket.results[0].status}'*. `;
	  sendMessage(requester, message, false, process.env.CHANNEL);
}

// Zendesk ticket update webhook sends an outbound message back to the user
app.post('/getTicketUpdate', (req, res) => {
  // we are checking the header for simple bearer auth
	console.log(req.headers.authorization);
	
  if (req.headers.authorization !== `Bearer ${process.env.LOCAL_API_TOKEN}`) {
    console.warn("Unauthenticated user tried to run Zendesk webhook.")
    res.sendStatus(401)
    return
  }
  const { requester_name: zendeskRequesterPhone, requester_name:zendeskRequesterName , comment: zendeskComment, ticket_id: zendeskTicketId, ticket_title: zendeskTicketTitle } = req.body

  //channel could be set to 'sms' or 'whatsapp'
  const CHANNEL = process.env.CHANNEL || "whatsapp";


  const isTemplateMessage = (VONAGE_WHATSAPP_NAMESPACE && VONAGE_WHATSAPP_TICKET_TEMPLATE_NAME && !zendeskComment.includes("\n") && CHANNEL === "whatsapp") ? true : false
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
  sendMessage(zendeskRequesterPhone, message, isTemplateMessage, CHANNEL);
  res.json(200);
});


function createZendeskTicket(text, from) {
  // below object ticket is only for demo purpose
  const data = JSON.stringify({
    ticket: {
      comment: {
        body: `${text}`
      },
      priority: ZENDESK_DEFAULT_PRIORITY,
      subject: `Whatsapp request: ${text.substr(0, 20)}...`,
      requester: {
      	name: from
       
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
	  const confirmMessage="Thank you for contacting Vonage. Your ticket has been raised successfully."
	  res.statusCode==201?sendMessage(from, confirmMessage, false, process.env.CHANNEL):console.log(`statusCode: ${res.statusCode}`);
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
  tunnel = localtunnel(PORT, { subdomain: process.env.LOCALTUNNEL_SUBDOMAIN }, (err, tunnel) => {
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
