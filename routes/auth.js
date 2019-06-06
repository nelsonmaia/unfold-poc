var express = require('express');
var router = express.Router();
var passport = require('passport');
var dotenv = require('dotenv');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
const _ = require('lodash');
const Auth0Client = require('../lib/Auth0Client');


dotenv.config();

const ManagementClient = require('auth0').ManagementClient

const management = new ManagementClient({
  token: process.env.AUTH0_APIV2_TOKEN,
  domain: process.env.AUTH0_DOMAIN
});

function _mergeMetadata(primaryUser, secondaryUser){

  const customizerCallback = function(objectValue, sourceValue){
    if (_.isArray(objectValue)){
      return sourceValue.concat(objectValue);
    }
  };
  const mergedUserMetadata = _.merge({}, secondaryUser.user_metadata, primaryUser.user_metadata, customizerCallback);
  const mergedAppMetadata = _.merge({}, secondaryUser.app_metadata, primaryUser.app_metadata, customizerCallback);

  return Promise.all([
    management.users.updateUserMetadata({ id: primaryUser.sub }, mergedUserMetadata),
    management.users.updateAppMetadata({ id: primaryUser.sub }, mergedAppMetadata)
  ]).then(result => {
    // save result in primary in session
    primaryUser.user_metadata = result[0].user_metadata || {};
    primaryUser.app_metadata = result[1].app_metadata || {};
  });
}


// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('auth0', {
  connection: 'criipto-verify-NO-BankID-Web',
  scope: 'openid email profile'
}), function (req, res) {
  res.redirect('/');
});

// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    console.log({user})
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }

    const smsId = 'sms|5cecf80650d83246039ffc4b'

    // 'GET /?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzbXN8NWNlY2Y1NzQ1MGQ4MzI0NjAzOWZmNjE1IiwiaWF0IjoxNTU5MDMzMjEzLCJleHAiOjE1NTkwMzM1MTMsImF1ZCI6ImNsaWVudF9pZCIsImlzcyI6InVuZm9sZCJ9.NuOwJvRZ2NZUWmcOxCgICHmIkwlHGiV_ADF2oUAb__k&state= 200 246.019 ms - 818'

    // Auth0Client.getUser(smsId)
    //   .then( targetUser => {
    //
    //     console.log({targetUser, user: user._json})
    //     return _mergeMetadata(user._json, targetUser);
    //   })
    //   .then(() => {
    //     return Auth0Client.linkAccounts(smsId, user._json.sub);
    //   })
    //   .then(() => {
    //     req.logIn(user, function (err) {
    //       if (err) { return next(err); }
    //       const returnTo = req.session.returnTo;
    //       delete req.session.returnTo;
    //       res.redirect(returnTo || '/user');
    //     });
    //   })
    //   .catch( err => {
    //     console.log('Error linking accounts!',err);
    //     next(err);
    //   });

    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/user');
    });

  })(req, res, next);
});

// Perform session logout and redirect to homepage
router.get('/logout', (req, res) => {
  req.logout();

  var returnTo = req.protocol + '://' + req.hostname;
  var port = req.connection.localPort;
  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo += ':' + port;
  }
  var logoutURL = new URL(
    util.format('https://%s/logout', process.env.AUTH0_DOMAIN)
  );
  var searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

module.exports = router;
