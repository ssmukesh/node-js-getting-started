var express = require('express');
var path = require('path');
var port = process.env.PORT || 5000;

var http = require('http');

var request = require('request');
var qs = require('querystring');
var util = require('util');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var QuickBooks = require('node-quickbooks');
var Tokens = require('csrf');
var csrf = new Tokens();

// var jsdom = require('jsdom');
// const { JSDOM } = jsdom;
// const { window } = (new JSDOM(`...`)).window;
//var window = document.defaultView;
// var $ = require('jquery')(window);

app.set('port', port);
app.set('appCenter', QuickBooks.APP_CENTER_BASE);
QuickBooks.setOauthVersion('2.0');

// Generic Express config
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.render('pages/qbconnect'));
app.get('/home', (req, res) => res.render('pages/home'));
app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// app.set('views', 'views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ resave: false, saveUninitialized: false, secret: 'smith' }));

app.use('/api_call', require('./routes/api_call.js'))

// INSERT YOUR CONSUMER_KEY AND CONSUMER_SECRET HERE

// SandBox
// var consumerKey = 'Q0q63VIwq7SAQ8v6aop4mol1V6n0jk2lUB5WKu4LPN60wJLgBF';
// var consumerSecret = 'gJaFcxJ8ouAx5RlQSkIjsjhwIUqfYXcP1IHaJeqC';

// PRODUCTION  
var consumerKey = 'Q0VDE5PpLWcqaT2sZHjjFYHakq2vB6OBqa67Uhm7JrlyOSzski';
var consumerSecret = 'FbEwwsfQi6V5DRUbjVAApAYjjMPuuz1161ipI1jg';

// app.get('/', function (req, res) {
//   res.redirect('/start');
// });

// app.get('/start', function (req, res) {
//   debugger;
//   console.log(QuickBooks.APP_CENTER_BASE);
//   res.render('pages/index', { locals: { port: port, appCenter: QuickBooks.APP_CENTER_BASE } });
// });

// OAUTH 2 makes use of redirect requests
function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};

app.get('/requestToken', function (req, res) {
  var redirecturl = QuickBooks.AUTHORIZATION_URL +
    '?client_id=' + consumerKey +
    '&redirect_uri=' + encodeURIComponent('https://janhavimeadows.herokuapp.com/callback') +  //Make sure this path matches entry in application dashboard
    '&scope=com.intuit.quickbooks.accounting' +
    '&response_type=code' +
    '&state=' + generateAntiForgery(req.session);

  res.redirect(redirecturl);
});

app.get('/callback', function (req, res) {
  var auth = (new Buffer(consumerKey + ':' + consumerSecret).toString('base64'));
  console.log(auth);

  var postBody = {
    url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + auth,
    },
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: 'https://janhavimeadows.herokuapp.com/callback'  //Make sure this path matches entry in application dashboard
    }
  };

  request.post(postBody, function (e, r, data) {
    var accessToken = JSON.parse(r.body);

    // save the access token somewhere on behalf of the logged in user
    var qbo = new QuickBooks(consumerKey,
      consumerSecret,
      accessToken.access_token, /* oAuth access token */
      false, /* no token secret for oAuth 2.0 */
      req.query.realmId,
      false, /* use a sandbox account */
      true, /* turn debugging on */
      14, /* minor version */
      '2.0', /* oauth version */
      accessToken.refresh_token /* refresh token */);

    global.QuickBooksConfig = qbo;

    //res.render('pages/index');

  });  
  // res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>');
  res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.assign("/home");window.close();</script></body></html>');
});

