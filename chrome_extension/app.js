
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
  , path = require('path')
  , mongoose = require('mongoose')
  , mongodb = require('mongodb')
  , async = require('async');

var app = express();
var port = process.env.PORT || 3000;

var db;

app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(logger(':method :url :status :response-time ms - :res[content-length] :date[iso]'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler());

app.post('/external_api', function(req, res) {
    var url = req.body.url + '?';
    var options = req.body.options;
    var option_keys = Object.keys(options);
    option_keys.map(function(val, idx) {
        url += val + '=' + options[val];
        if (idx < option_keys.length - 1) {
            url += '&';
        }
    });

    http.get(url, function(result) {
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

app.post('/get_blacklist', function(req, res) {
    var db_list = db.collection('BlackLists');
    var id_list = req.body.id_list;
    db_list.find({
        type: req.body.type,
        filtered_num: {
            $gt: 1 // CHANGE
        },
        id: {
            $in: id_list
        }
    }, {
        _id: 0
    }).toArray(function(err, result) {
        if (err) {
            console.log(err);
            res.json({
                err: err,
                result: null
            });
        } else {
            res.json({
                err: null,
                result: result || []
            });
        }
    });
});
app.post('/add_blacklist', function(req, res) {
    var db_list = db.collection('BlackLists');
    var list = req.body.list || [];
    var id_list = [];
    var filtered_num_list = [];
    var article_list = [];
    var type = req.body.type;

    list.map(function(val) {
        id_list.push(val.id);
        filtered_num_list.push(parseInt(val.filtered_num, 10));
        article_list.push(typeof val.article === 'string' ? JSON.parse(val.article) : val.article);
    });

    db_list.find({
        id: {
                $in: id_list
            },
        type: type
    }, {
        _id: 0
    }).toArray(function(find_err, find_result) {
        if (find_err) {
            console.log(find_err);
            res.json({
                err: find_err,
                result: null
            });
        } else {
            find_result = find_result || [];
            async.map(find_result, function(item, next) {
                async.map(find_result.article, function(_item, _next) {
                    db_list.findOne({
                        id: item.id,
                        article: _item
                    }, function(_find_err, _find_result) {
                        if (_find_result) {
                            var _idx = id_list.indexOf(item.id);
                            filtered_num_list[_idx]--;
                            article_list[_idx].splice(article_list[_idx].indexOf(_item), 1);
                        }
                        _next();
                    });
                }, function(_async_err, _async_result) {
                    var idx = id_list.indexOf(item.id);
                    if (filtered_num_list[idx] > 0) {
                        db_list.update({
                            id: item.id
                        }, {
                            $inc: {
                                filtered_num: filtered_num_list[idx]
                            },
                            $pushAll: {
                                article: article_list[idx]
                            }
                        }, function(update_err, update_result) {
                            next(update_err);
                        });
                    } else {
                        next();
                    }
                });
            }, function(async_err, results) {
                find_result.map(function(item) {
                    var idx = id_list.indexOf(item.id);
                    id_list.splice(idx, 1);
                    filtered_num_list.splice(idx, 1);
                });

                var insert_list = [];
                id_list.map(function(item, idx) {
                    insert_list.push({
                        id: item,
                        filtered_num: filtered_num_list[idx],
                        type: type
                    });
                });

                if (insert_list.length) {
                    db_list.insertMany(insert_list, function(insert_err, insert_result) {
                        res.json({
                            err: insert_err,
                            result: insert_result || null
                        });
                    });
                } else {
                    res.json({
                        err: async_err,
                        result: results
                    });
                }
            });
        }
    });
});

var connect_db = function() {
    var db_url = 'mongodb://localhost:27017/cs409';
    var mongoClient = mongodb.MongoClient;

    mongoClient.connect(db_url, function(err, database) {
        if (err) throw err;
        console.log('mongoDB connected');
        db = database;
    });
};

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    connect_db();
});

var script = function(db) {
    db.collection('BlackLists').update({
        filtered_num: {
            $lt: 5
        }
    }, {
        $set: {
            filtered_num: 0
        }
    }, {
        multi: true
    }, function(err, res) {
        console.log(err, res);
    });
};
