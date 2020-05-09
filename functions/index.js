/**
 *
 * @author Hemant Juyal
 */

'use strict';

const functions = require('firebase-functions');

const {
  WebhookClient
} = require('dialogflow-fulfillment');
const {
  Card,
  Suggestion
} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug';
const riddles = require('./data/riddles');
const riddles_hi = require('./data/riddles_hi');

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent =
    new WebhookClient({
      request,
      response
    });

  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  let conv = agent.conv();
  const isWebBrowserAvailable = conv.surface.capabilities.has('actions.capability.WEB_BROWSER');
  const isScreenOutputAvailable = conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT');
  const isAudioOutputAvailable = conv.surface.capabilities.has('actions.capability.AUDIO_OUTPUT');

  console.log('action surface capability');
  console.log('isWebBrowserAvailable', isWebBrowserAvailable, 'isScreenOutputAvailable',
    isScreenOutputAvailable, 'isAudioOutputAvailable', isAudioOutputAvailable);

  function welcome(agent) {
    console.log('welcome called');
    console.log('agent locale ', agent.locale);

    let riddle = getRiddle(agent.locale);

    if (riddle.locale === 'en') {
      agent.add('Here is the riddle. ');
      agent.add(riddle.riddle_text);
      agent.context.set(riddle.context);
      if (isScreenOutputAvailable) {
        agent.add(new Card({
          title: 'Ridiculous Riddle of The Day',
          imageUrl: 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/logo.jpg',
          text: riddle.riddle_text
        }));
        agent.add(new Suggestion('ask me another riddle'));
      }
    } else if (riddle.locale === 'hi') {
      agent.add('ये रही पहेली! ');
      agent.add(riddle.riddle_text);
      agent.context.set(riddle.context);
      if (isScreenOutputAvailable) {
        agent.add(new Card({
          title: 'आज की मज़ेदार पहेली ',
          imageUrl: 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/logo.jpg',
          text: riddle.riddle_text
        }));
        agent.add(new Suggestion('कोई और पहेली पूछो'));
      }
    } //end else-if
  } //end main


  function riddleanswer(agent) {
    console.log('riddleanswer called');
    console.log('agent locale ', agent.locale);

    let riddleIndex = agent.context.get('riddle-index');
    let riddle_answer_user = agent.parameters['any'];
    console.log('riddleIndex data ', JSON.stringify(riddleIndex));
    console.log('riddleIndex ', riddleIndex.parameters.rindex);
    console.log('riddle answer user ', riddle_answer_user);

    let result = getRiddleAnswer(agent.locale, riddleIndex.parameters.rindex, riddle_answer_user);
    console.log('result ', result);
    let riddle = getRiddle(agent.locale);

    if (result.locale === 'en') {
      let riddleAnswerEn = 'The answer is ' + result.riddle_answer + ' ';
      let riddleEn = ' Here is the next riddle. ' + riddle.riddle_text;
      if (result.is_answer_correct) {
        agent.add('WoW. You got it right. ' + riddleAnswerEn);
      } else {
        agent.add('Oh ho. You missed it. ' + riddleAnswerEn);
      }
      agent.add(riddleEn);
      agent.context.set(riddle.context);
      if (isScreenOutputAvailable) {
        agent.add(new Card({
          title: 'Riddle Answer',
          imageUrl: 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/logo.jpg',
          text: result.riddle_answer + riddleEn
        }));
        agent.add(new Suggestion('ask me again'));
        agent.add(new Suggestion('one more fun riddle'));
        agent.add(new Suggestion('let me try again'));
      }
    } else if (result.locale === 'hi') {
      let riddleAnswerHi = ' सही उत्तर है! ' + result.riddle_answer + ' ';
      let riddleHi = ' ये रही अगली पहेली! ' + riddle.riddle_text;
      if (result.is_answer_correct) {
        agent.add('बहुत ख़ूब! सही जवाब! ' + riddleAnswerHi);
      } else {
        agent.add('अफ़सोस के साथ कहना पड़ रहा है, आपका जवाब गलत है! ' + riddleAnswerHi);
      }
      agent.add(riddleHi);
      agent.context.set(riddle.context);
      if (isScreenOutputAvailable) {
        agent.add(new Card({
          title: 'पहेली का उत्तर',
          imageUrl: 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/logo.jpg',
          text: result.riddle_answer + riddleHi
        }));
        agent.add(new Suggestion('एक और मज़ेदार पहेली पूछो'));
        agent.add(new Suggestion('फिर से पूछो'));
        agent.add(new Suggestion('मुझे एक और चान्स दो'));
      }
    } //end else-if
  } //end main


  function getRiddle(locale) {
    console.log('getRiddle called');

    let index, riddle_text;
    index = Math.floor(Math.random() * (riddles.riddles_data.length - 1));
    console.log('riddle index ', index);

    if (locale === 'en' ||
      locale === 'en-in' || locale === 'en-us' ||
      locale === 'en-gb' || locale === 'en-ca' ||
      locale === 'en-au') {
      locale = 'en';
      riddle_text = riddles.riddles_data[index].question;
    } else if (locale === 'hi') {
      locale = 'hi';
      riddle_text = riddles_hi.riddles_data_hi[index].question;
    }

    const context = {
      'name': 'riddle-index',
      'lifespan': 10,
      'parameters': {
        'rindex': index
      }
    };

    return {
      'locale': locale,
      'index': index,
      'riddle_text': riddle_text,
      'context': context
    };

  } //end main


  function getRiddleAnswer(locale, rindex, ransweruser) {
    console.log('getRiddleAnswer called');
    console.log('locale ', locale, 'rindex', rindex, 'riddle answer user - ', ransweruser);

    let is_answer_correct = false;
    let riddle_answers;
    if (locale === 'en' ||
      locale === 'en-in' || locale === 'en-us' ||
      locale === 'en-gb' || locale === 'en-ca' ||
      locale === 'en-au') {
      locale = 'en';
      riddle_answers = riddles.riddles_data[rindex].answer;
    } else if (locale === 'hi') {
      locale = 'hi';
      riddle_answers = riddles_hi.riddles_data_hi[rindex].answer;
    }

    for (let count = 0; count < riddle_answers.length; count++) {
      if (riddle_answers[count].toLowerCase() === ransweruser.toLowerCase()) {
        is_answer_correct = true;
        console.log('is answer correct', is_answer_correct, 'correct answer ', riddle_answers[count]);
        break;
      }
    } // end for

    return {
      'locale': locale,
      "is_answer_correct": is_answer_correct,
      "riddle_answer": riddle_answers[0]
    };
  } //end main

  function fallback(agent) {
    console.log('fallback called');
    console.log('agent locale ', agent.locale);

    riddleanswer(agent);
  } //end main


  function exitconversation(agent) {
    console.log('exitconversation called');
    console.log('agent locale ', agent.locale);

    if (agent.locale === 'en' ||
      agent.locale === 'en-in' || agent.locale === 'en-us' ||
      agent.locale === 'en-gb' || agent.locale === 'en-ca' ||
      agent.locale === 'en-au') {
      agent.add(`Okay, let's try this again later`);
    } else if (agent.locale === 'hi') {
      agent.add('ठीक है! बाद में मिलते है');
    }
  } //end main


  let intentMap = new Map();
  intentMap.set('Welcome Intent', welcome);
  intentMap.set('RiddleAnswer Intent', riddleanswer);
  intentMap.set('Fallback Intent', fallback);
  intentMap.set('Conversation Exits Intent', exitconversation);
  agent.handleRequest(intentMap);

});