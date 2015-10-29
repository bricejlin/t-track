const http = require('superagent');
const Promise = require('bluebird');
const Firebase = require('firebase');

const STUBHUB_URL = 'https://api.stubhub.com/';
const EVENTS_URI = 'search/catalog/events/v2?id=';

const rootRef = new Firebase('https://stubhub-tracker.firebaseio.com/events');

const SHEventCodes = [
  '9348936',
  '9365164',
  '9390556',
  '9390558',
  '9315233'
];

// Hide in config
const AUTH = 'Bearer Y52HUkJvHu1tTgzxTL4d9ZnKo_wa';

const url = (id) => STUBHUB_URL + EVENTS_URI + id;

const getEvent = (url) => {
  const deferred = Promise.defer();

  http
    .get(url)
    .set('Authorization', AUTH)
    .end((err, res) => {
    if (res.ok) {
      deferred.resolve(res.body);
    } else {
      deferred.resolve('Madd uhrss: ', err);
    }
  });

  return deferred.promise;
};

const parseEventRes = (res) => {
  if (res && res.numFound === 0) {
    return null;
  }

  const event = res.events[0];
  
  const date = (new Date()).toISOString();
  
  event.tickets = Object.assign({}, event.ticketInfo, {date: date});
  
  return event;
};

setInterval(fetch, 3000);

function fetch () {
  SHEventCodes.forEach(function (event) {
    getEvent(url(event))
      .then(parseEventRes)
      .then((event) => {
        if (event === null) {
          return;
        }
        
        // Check listing already exists
        rootRef.child(event.id).once('value', function (snap) {
          // If exist, update ticket prices
          if (snap.val()) {
            rootRef.child(event.id + '/tickets').push().set(event.tickets, function (err) {
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
      });
  });
}

