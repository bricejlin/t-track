const http = require('superagent');
const Promise = require('bluebird');
const Firebase = require('firebase');
const curry = require('curry');

const config = require('./conf.json');
const AUTH = config.stubHubAuth;

const stubHubFactory = require('./stubhubClient');

const rootRef = new Firebase('https://stubhub-tracker.firebaseio.com/');

const EVENTS_URI = 'search/catalog/events/v2?id=';
const ONE_MINUTE = 1000 * 60;
const ONE_HOUR = ONE_MINUTE * 60;

const sHEventCodes = [
  '9348936'
];

const url = (id) => stubHubFactory.STUBHUB_BASE_URL + EVENTS_URI + id;

const stubHub = stubHubFactory.create(AUTH);

const updateTicketInfo = curry(updateTicketInfoInFirebase);

setInterval(fetch, config.REFETCH_HOUR_INTERVAL * ONE_HOUR);

function fetch () {  
  const date = (new Date()).toISOString().split('.')[0];

  sHEventCodes.forEach(function (event) {
    stubHub.fetch(url(event))
      .then(parseEventRes)
      .then(addEventToFirebase)
      .then(updateTicketInfo(rootRef, date));
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
 * Update ticket info in firebase
 * @param {string} date - iso datetime string
 * @param {obj} event
 * @return {void}
 */
function updateTicketInfoInFirebase (rootRef, date, event) {
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

  const deferred = Promise.defer();
  const eventPath = 'events/' + event.id;
  
  checkIfObjectExistsInFirebase(rootRef, eventPath)
    .then(function (isExisting) {
      if (isExisting) {
        // Pass event on
        deferred.resolve(event);
      } else {
        updateEventFieldInFirebase(rootRef, eventPath, event);
      }
    });

  return deferred.promise;
}

function updateEventFieldInFirebase (rootRef, eventPath, event) {
  const deferred = Promise.defer();

  rootRef.child(eventPath).set(event, function (err) {
    if (err) {
      console.log('sum ting wong');
      deferred.reject(err);
    } else {
      console.log('New event saved successfully!');
      deferred.resolve(event);
    }
  });
  
  return deferred.promise;
}

/**
 * Checks if a path in firebase db holds any values
 * @param {firebaseClient} rootRef
 * @param {string} path
 * @return {promise}
 */
function checkIfObjectExistsInFirebase (rootRef, path) {
  var deferred = Promise.defer();

  rootRef.child(path).once('value', function (snap) {
    deferred.resolve(!!snap.val());
  });

  return deferred.promise;
}
