const http = require('superagent');
const Promise = require('bluebird');
const Firebase = require('firebase');

const config = require('./conf.json');
const AUTH = config.stubHubAuth;

const EVENTS_URI = 'search/catalog/events/v2?id=';

const stubHubFactory = require('./stubhubClient');

const rootRef = new Firebase('https://stubhub-tracker.firebaseio.com/events');

const ONE_MINUTE = 1000 * 60;
const ONE_HOUR = ONE_MINUTE * 60;

const sHEventCodes = [
  '9348936',
  '9365164',
  '9390556',
  '9390558',
  '9315233'
];

const url = (id) => stubHubFactory.STUBHUB_BASE_URL + EVENTS_URI + id;

const stubHub = stubHubFactory.create(AUTH);

// setInterval(fetch, ONE_HOUR * 2);
fetch();

function fetch () {
  sHEventCodes.forEach(function (event) {
    stubHub.fetch(url(event))
      .then(parseEventRes)
      .then(sendToFirebase);
  });
}

function sendToFirebase (event) {
  if (event === null) return;
  
  // Check listing already exists
  rootRef.child(event.id).once('value', function (snap) {
    // If it exists, append updated ticket prices
    if (snap.val()) {
      const ticketInfo = addDate(event.ticketInfo);
      rootRef.child(event.id + '/tickets').push().set(ticketInfo, function (err) {
        if (err) {
          console.log('womp');
        } else {
          console.log('ticket prices updated!');
        }
      });
    } else {
      // Otherwise create a new listing
      rootRef.child(event.id).set(event, function (err) {
        if (err) {
          console.log('sum ting wong');
        } else {
          console.log('data saved successfully!');
        }
      });
    }
  });
}

/**
 * Parses response from stubhub event api
 * @param {object} res
 * @return {object}
 */
function parseEventRes (res) {
  if (res && res.numFound === 0) {
    return null;
  }
  
  return res.events[0];
};

/**
 * Add current iso datetime prop to obj
 * @param {object} obj
 * @return {object}
 */
function addDate (obj) {
  const date = (new Date()).toISOString();
  return Object.assign({}, obj, {
    date: date
  });
}