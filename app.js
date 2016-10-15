var builder = require('botbuilder');
var restify = require('restify');
var prompts = require('./prompts');
//proba

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 80, function(){console.log('im listening on port ' + process.env.PORT + " bla: " + server.name + " ijf " + server.url);});

var connector = new builder.ChatConnector({
    appId : process.env.MICROSOFT_APP_ID,
    appPassword : process.env.MICROSOFT_APP_PASSWORD});
var bot = new builder.UniversalBot(connector);
server.post('api/solution', connector.listen());

/** Use CrunchBot LUIS model for the root dialog. */
var model = 'https://api.projectoxford.ai/luis/v1/application?id=598f6090-ce4a-46f3-95d7-583b20de1881&subscription-key=464b86fd3c6b4123a93daf624e9b00ca&q=';
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', intents);

/** Answer help related questions like "what can I say?" */
intents.matches('bla', '/helpMessage');
intents.matches('Help', builder.DialogAction.send(prompts.helpMessage));
intents.onDefault(builder.DialogAction.send(prompts.helpMessage));

/** Answer acquisition related questions like "how many companies has microsoft bought?" */
intents.matches('Acquisitions', [askCompany, answerQuestion('acquisitions', prompts.answerAcquisitions)]);

/** Answer IPO date related questions like "when did microsoft go public?" */
intents.matches('IpoDate', [askCompany, answerQuestion('ipoDate', prompts.answerIpoDate)]);

/** Answer headquarters related questions like "where is microsoft located?" */
intents.matches('Headquarters', [askCompany, answerQuestion('headquarters', prompts.answerHeadquarters)]);

/** Answer description related questions like "tell me about microsoft" */
intents.matches('Description', [askCompany, answerQuestion('description', prompts.answerDescription)]);

/** Answer founder related questions like "who started microsoft?" */
intents.matches('Founders', [askCompany, answerQuestion('founders', prompts.answerFounders)]);

/** Answer website related questions like "how can I contact microsoft?" */
intents.matches('website', [askCompany, answerQuestion('website', prompts.answerWebsite)]);

/** 
 * This function the first step in the waterfall for intent handlers. It will use the company mentioned
 * in the users question if specified and valid. Otherwise it will use the last company a user asked 
 * about. If it the company is missing it will prompt the user to pick one. 
 */
 function askCompany(session, args, next) {
      // First check to see if we either got a company from LUIS or have a an existing company
      // that we can multi-turn over.
      var company;
      var entity = builder.EntityRecognizer.findEntity(args.entities, 'CompanyName');
      if (entity) {
          // The user specified a company so lets look it up to make sure its valid.
          // * This calls the underlying function Prompts.choice() uses to match a users response
          //   to a list of choices. When you pass it an object it will use the field names as the
          //   list of choices to match against. 
          company = builder.EntityRecognizer.findBestMatch(data, entity.entity);
      } else if (session.dialogData.company) {
          // Just multi-turn over the existing company
          company = session.dialogData.company;
      }
      
      // Prompt the user to pick a ocmpany if they didn't specify a valid one.
      if (!company) {
          // Lets see if the user just asked for a company we don't know about.
          var txt = entity ? session.gettext(prompts.companyUnknown, { company: entity.entity }) : prompts.companyMissing;
          
          // Prompt the user to pick a company from the list. They can also ask to cancel the operation.
          builder.Prompts.choice(session, txt, data);
      } else {
          // Great! pass the company to the next step in the waterfall which will answer the question.
          // * This will match the format of the response returned from Prompts.choice().
          next({ response: company })
      }
  }
/*
app.get('/', function(req, res){
  askCompany()
});
*/
/**
 * This function generates a generic answer step for an intent handlers waterfall. The company to answer
 * a question about will be passed into the step and the specified field from the data will be returned to 
 * the user using the specified answer template. 
 */
function answerQuestion(field, answerTemplate) {
    return function (session, results) {
        // Check to see if we have a company. The user can cancel picking a company so IPromptResult.response
        // can be null. 
        if (results.response) {
            // Save company for multi-turn case and compose answer            
            var company = session.dialogData.company = results.response;
            var answer = { company: company.entity, value: data[company.entity][field] };
            session.send(answerTemplate, answer);
        } else {
            session.send(prompts.cancel);
        }
    };
}


/** 
 * Sample data sourced from http://crunchbase.com on 3/18/2016 
 */
var data = {
  'Microsoft': {
      acquisitions: 170,
      ipoDate: 'Mar 13, 1986',
      headquarters: 'Redmond, WA',
      description: 'Microsoft, a software corporation, develops licensed and support products and services ranging from personal use to enterprise application.',
      founders: 'Bill Gates and Paul Allen',
      website: 'http://www.microsoft.com'
  },
  'Apple': {
      acquisitions: 72,
      ipoDate: 'Dec 19, 1980',
      headquarters: 'Cupertino, CA',
      description: 'Apple is a multinational corporation that designs, manufactures, and markets consumer electronics, personal computers, and software.',
      founders: 'Kevin Harvey, Steve Wozniak, Steve Jobs, and Ron Wayne',
      website: 'http://www.apple.com'
  },
  'Google': {
      acquisitions: 39,
      ipoDate: 'Aug 19, 2004',
      headquarters: 'Mountain View, CA',
      description: 'Google is a multinational corporation that is specialized in internet-related services and products.',
      founders: 'Baris Gultekin, Michoel Ogince, Sergey Brin, and Larry Page',
      website: 'http://www.google.com'
  },
  'Amazon': {
      acquisitions: 58,
      ipoDate: 'May 15, 1997',
      headquarters: 'Seattle, WA',
      description: 'Amazon.com is an international e-commerce website for consumers, sellers, and content creators.',
      founders: 'Sachin Agarwal and Jeff Bezos',
      website: 'http://amazon.com'
  }
};
