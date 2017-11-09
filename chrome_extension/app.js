
/**
 * Module dependencies.
 */

var express = require('express')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , logger = require('morgan')
  , errorHandler = require('errorhandler')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();
var port = process.env.PORT || 3000;

app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
// app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler());

//app.get('/', routes.index);
app.post('/matching', routes.matching);
app.get('/external_api', function(req, res) {
    var url = req.query.url + '?';
    var options = req.query.options;
    var option_keys = Object.keys(options);
    option_keys.map(function(val, idx) {
        url += val + '=' + options[val];
        if (idx < option_keys.length - 1) {
            url += '&';
        }
    });

    http.get(url, function(result) {
        console.log('STATUS: ' + result.statusCode);
        console.log('HEADERS: ' + JSON.stringify(result.headers));
        
        if (result.statusCode >= 400) {
            console.log('external_api failed with code ', result.statusCode);
            result.resume();
            res.send(null);
        } else {
            var bodyData = '';;
            result.on('data', function(chunk) {
                bodyData += chunk;
            }).on('end', function() {
                var body = JSON.parse(bodyData);
                res.send(body);
            });
        }
    }).on('error', function(err) {
        console.log('external_api error: ', err.message);
    });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
