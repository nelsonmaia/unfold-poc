function (user, context, callback) {
  const request = require('request');
  console.log('redirect rule');
  console.log('context', context);

  var config = {
    endpoints: {
      userApi: auth0.baseUrl + '/users',
      usersByEmailApi: auth0.baseUrl + '/users-by-email'
    }
  };

  function apiCall (options) {
    return new Promise(function (resolve, reject) {
      var reqOptions = Object.assign({
        url: options.url,
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken,
          Accept: 'application/json'
        },
        json: true
      }, options);

      request(reqOptions, function handleResponse (err, response, body) {
        if (err) {
          reject(err);
        } else if (response.statusCode < 200 || response.statusCode >= 300) {
          console.error('API call failed: ', body);
          reject(new Error(body));
        } else {
          resolve(response.body);
        }
      });
    });
  }

  function createToken (clientId, clientSecret, issuer, user) {
    var options = {
      expiresInMinutes: 5,
      audience: clientId,
      issuer: issuer
    };
    return jwt.sign(user, clientSecret, options);
  }

  function verifyToken (clientId, clientSecret, issuer, token, cb) {
    jwt.verify(
      token,
      clientSecret, {
        audience: clientId,
        issuer: issuer
      },
      cb
    );
  }

  function mergeAccount (userId) {
    const userApiUrl = auth0.baseUrl + '/users';
    const userSearchApiUrl = auth0.baseUrl + '/users/' + userId;

    var linkUri = config.endpoints.userApi + '/' + user.user_id + '/identities';
    var headers = {
      Authorization: 'Bearer ' + auth0.accessToken,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    };

    return apiCall({
      method: 'GET',
      url: config.endpoints.userApi + '/' + userId + '?fields=identities',
      headers: headers
    })
      .then(function (secondaryUser) {
        console.log('secondaryUser')
        console.log(secondaryUser)

        var provider = secondaryUser &&
          secondaryUser.identities &&
          secondaryUser.identities[0] &&
          secondaryUser.identities[0].provider;

        return apiCall({
          method: 'POST',
          url: linkUri,
          headers,
          json: { user_id: userId, provider: provider }
        });
      })
      .then(function (_) {
        // TODO: Ask about this
        console.info('Successfully linked accounts for user: ', user.email);
        return _;
      })
      .then(
        () => callback(null, user, context),
        (err) => callback(err, user, context),
      );

    // request({
    //     url: userSearchApiUrl,
    //     headers: {
    //       Authorization: 'Bearer ' + auth0.accessToken
    //     }
    //   },
    //   function (err, response, body) {
    //     if (err) return callback(err);
    //     if (response.statusCode !== 200) return callback(new Error(body));
    //
    //     var data = JSON.parse(body);
    //     console.log({ data });
    //     console.log({ identities: data.identities });
    //
    //     if (data.length > 1) {
    //       return callback(new Error('[!] Rule: Multiple user profiles already exist - cannot select base profile to link with'));
    //     }
    //     if (data.length === 0) {
    //       console.log('[-] Skipping link rule');
    //       return callback(null, user, context);
    //     }
    //
    //     const originalUser = data;
    //     const provider = user.identities[0].provider;
    //     const providerUserId = user.identities[0].user_id;
    //
    //     const jsonData = { provider: provider, user_id: String(providerUserId) };
    //
    //     console.log({ jsonData, originalUser_user_id: originalUser.user_id });
    //
    //     user.app_metadata = user.app_metadata || {};
    //     user.user_metadata = user.user_metadata || {};
    //     auth0.users.updateAppMetadata(originalUser.user_id, user.app_metadata)
    //       .then(() => auth0.users.updateUserMetadata(originalUser.user_id, user.user_metadata))
    //       .then(function () {
    //         request.post({
    //           url: userApiUrl + '/' + originalUser.user_id + '/identities',
    //           headers: {
    //             Authorization: 'Bearer ' + auth0.accessToken
    //           },
    //           json: jsonData
    //         }, function (err, response, body) {
    //           if (response && response.statusCode >= 400) {
    //             console.log(response.statusCode);
    //             console.log(response.statusMessage);
    //             return callback(new Error('Error linking account: ' + response.statusMessage));
    //           }
    //           context.primaryUser = originalUser.user_id;
    //           callback(null, user, context);
    //         });
    //       })
    //       .catch(function (err) {
    //         callback(err, user, context);
    //       });
    //   });
  }

  // Check if user is accessing this rule without being redirected back
  if (context.protocol !== 'redirect-callback' && context.clientID !== 'rSjyjy2L0HMDz4zBX1tMrR5h6po6O421') {

    // Assuming accountMigratedFlag is the flat that the user is migrated
    // User has initiated a login and is forced to change their password
    // Send user's information in a JWT to avoid tampering

    var token = createToken(
      'client_id',
      'obos',
      'unfold', {
        sub: user.user_id,
        email: user.email
      }
    );

    // context.redirect = {
    //   url: "http://localhost:3000/?token="+token
    // };
    // return callback(null, user, context);

    return mergeAccount('adfs|criipto-verify-NO-BankID-Web|00d62f8ac70e42c1b97660aa9dfc0ce3');

  } else {
    console.log(user, context.request.query);
    if (context.request.query && context.request.query.user_id) {
      return mergeAccount(context.request.query.user_id);
    }

    return callback(null, user, context);
  }
}
