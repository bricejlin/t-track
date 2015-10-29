const http = require('superagent');
const Promise = require('bluebird');
const curry = require('curry');

const fetch = function (auth, url) {
	const deferred = Promise.defer();

	http.get(url)
		.set('Authorization', auth)
		.end((err, res) => {
			if (res.ok) {
				deferred.resolve(res.body);
			} else {
				deferred.reject('Madd uhrss: ', err);
			}
		});
	
	return deferred.promise;
}

const create = function (authToken) {
	return {
		fetch: curry(fetch)(authToken)
	};
};

const STUBHUB_BASE_URL = 'https://api.stubhub.com/';

module.exports = { create, STUBHUB_BASE_URL }