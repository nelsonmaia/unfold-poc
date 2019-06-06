var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

const verifyToken = (clientId, clientSecret, issuer, token, cb) => {
  jwt.verify(
    token,
    clientSecret, {
      audience: clientId,
      issuer: issuer
    },
    cb
  );
}

/* GET home page. */
router.get('/', function (req, res, next) {
  verifyToken(
    'client_id',
    'obos',
    'unfold',
    req.query.token,
    (err, decoded) => {
      console.log(err);
      console.log({decoded});
    }
  );
  res.render('index', { title: 'Auth0 Webapp sample Nodejs', state: req.query.state });
});

module.exports = router;
