/*-----------------------------------------------------------------------------
A simple "Hello World" bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var prompts = require('./prompts');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// LUIS
//=========================================================

var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=eaf27fc0-5c7d-4a35-a829-9f960c7c7e21&subscription-key=464b86fd3c6b4123a93daf624e9b00ca&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

//=========================================================
// dialog
//=========================================================

dialog.matches("Order", [askOrder, answerOrder('order', prompts.orderString)]);
dialog.onDefault(builder.DialogAction.send(prompts.cancel));

function askOrder(session, args, next){
	var order;
	
	var entity = builder.EntityRecognizer.findEntity(args.entities, 'Food::sandwich');
	session.send("ro " + JSON.stringify(entity));
	if (entity) {
        // The user specified a order so lets look it up to make sure its valid.
        // * This calls the underlying function Prompts.choice() uses to match a users response
        //   to a list of choices. When you pass it an object it will use the field names as the
        //   list of choices to match against. 
        console.log("entity: " + entity.entity);
        order = builder.EntityRecognizer.findBestMatch('', entity.entity);
    } else if (session.dialogData.order) {
        // Just multi-turn over the existing order
        order = session.dialogData.order;
    }

    if (!order) {
        // Lets see if the user just asked for a order we don't know about.
        var txt = entity ? session.gettext(prompts.orderUnknown, { order: entity.entity }) : prompts.orderUnknown;
        
        // Prompt the user to pick a order from the list. They can also ask to cancel the operation.
        builder.Prompts.choice(session, txt, data);
    } else {
        // Great! pass the order to the next step in the waterfall which will answer the question.
        // * This will match the format of the response returned from Prompts.choice().
        next({ response: order })
    }
}

function answerOrder(field, answerTemplate) {
    return function (session, results) {
        // Check to see if we have a company. The user can cancel picking a company so IPromptResult.response
        // can be null. 
        if (results.response) {
            // Save company for multi-turn case and compose answer            
            var order = session.dialogData.order = results.response;
            var answer = { order: order.entity, value: data[order.entity][field] };
            session.send(answerTemplate, answer);
        } else {
            session.send(prompts.cancel);
        }
    };
}

