require.paths.unshift("../lib");

GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('mongodb/db');
process.mixin(mongo, require('mongodb/connection'));
process.mixin(mongo, require('mongodb/bson/bson'));

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db.open(function(db) {
  db.dropCollection(function() {
    // A capped collection has a max size and optionally a max number of records.
    // Old records get pushed out by new ones once the size or max num records is
    // reached.
    db.createCollection(function(collection) {
      for(var i = 0; i < 100; i++) {
        collection.insert({'a':i});
      }
      
      // We will only see the last 12 records
      collection.find(function(cursor) {
        cursor.toArray(function(items) {
          sys.puts("The number of records: " + items.length);
          db.close();
        })
      })
    }, 'test', {'capped':true, 'size':1024, 'max':12});    
  }, 'test');
});