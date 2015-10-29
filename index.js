const http = require('superagent');
const Promise = require('bluebird');
const Firebase = require('firebase');
const curry = require('curry');

const config = require('./conf.json');
const AUTH = config.stubHubAuth;

const EVENTS_URI = 'search/catalog/events/v2?id=';

const stubHubFactory = require('./stubhubClient');

const rootRef = new Firebase('https://stubhub-tracker.firebaseio.com/');

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

const updateTicketInfo = curry(updateTicketInfoInFirebase);

// setInterval(fetch, ONE_HOUR * 2);
fetch();

function fetch () {  
  const date = (new Date()).toISOString().split('.')[0];

  sHEventCodes.forEach(function (event) {
    stubHub.fetch(url(event))
      .then(parseEventRes)
      .then(addEventToFirebase)
      .then(updateTicketInfo(date));
  });
}

/**
 * Update ticket info in firebase
 * @param {string} date - iso datetime string
 * @param {obj} event
 * @return {void}
 */
function updateTicketInfoInFirebase (date, event) {
  var info = {
    eventId: event.id,
    ticketInfo: event.ticketInfo
  };

  rootRef.child('ticketInfo/' + date).push().set(info, function (err) {
    if (err) {
      console.log(';(');
    } else {
      console.log('Updated ticket info for ' + info.eventId);
    }
  });
};

function addEventToFirebase (event) {
  if (event === null) return;
  var deferred = Promise.defer();
  
  // Check listing already exists
  rootRef.child('events/' + event.id).once('value', function (snap) {
    // If not, add event to firebase
    if (!snap.val()) {
      rootRef.child('events/' + event.id).set(event, function (err) {
        if (err) {
          console.log('sum ting wong');
          deferred.reject(err);
        } else {
          console.log('data saved successfully!');
          deferred.resolve(event);
        }
      });
    } else {
      deferred.resolve(event);
    }
  });
  
  return deferred.promise;
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