require.paths.unshift("../lib");

GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('mongodb/db');
process.mixin(mongo, require('mongodb/connection'));
process.mixin(mongo, require('mongodb/bson/bson'));
process.mixin(mongo, require('mongodb/gridfs/gridstore'));

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

sys.puts(">> Connecting to " + host + ":" + port);
var db1 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db1.open(function(db) {
  // Write a new file
  var gridStore = new mongo.GridStore(db, "foobar", "w");
  gridStore.open(function(gridStore) {    
    gridStore.write(function(gridStore) {
      gridStore.close(function(result) {
        // Read the file and dump the contents
        dump(db, 'foobar');
  
        // Append more data
        gridStore = new mongo.GridStore(db, 'foobar', "w+");
        gridStore.open(function(gridStore) {
          gridStore.write(function(gridStore) {
            gridStore.puts(function(gridStore) {
              gridStore.close(function(result) {
                dump(db, 'foobar');          
  
                // Overwrite
                gridStore = new mongo.GridStore(db, 'foobar', "w");
                gridStore.open(function(gridStore) {
                  gridStore.write(function(gridStore) {
                    gridStore.close(function(result) {
                      dump(db, 'foobar', function() {
                        db.close();                        
                      });
                    });
                  }, 'hello, sailor!');
                });
              });
            }, 'line two');
          }, '\n');
        });
      });
    }, "hello world!");
  });
});

var db2 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db2.open(function(db) {
  // File existence tests
  var gridStore = new mongo.GridStore(db, "foobar2", "w");
  gridStore.open(function(gridStore) {    
    gridStore.write(function(gridStore) {
      gridStore.close(function(result) {
        mongo.GridStore.exist(function(result) {
          sys.puts("File 'foobar2' exists: " + result);
        }, db, 'foobar2');
        
        mongo.GridStore.exist(function(result) {
          sys.puts("File 'does-not-exist' exists: " + result);
        }, db, 'does-not-exist');
        
        // Read with offset(uses seek)
        mongo.GridStore.read(function(data) {
          sys.puts(data);
        }, db, 'foobar2', 6, 7);

        // Rewind/seek/tell
        var gridStore2 = new mongo.GridStore(db, 'foobar2', 'w');
        gridStore2.open(function(gridStore) {
          gridStore.write(function(){}, 'hello, world!');
          gridStore.rewind(function(){});
          gridStore.write(function(){}, 'xyzzz');
          gridStore.tell(function(tell) {
            sys.puts("tell: " + tell);       // Should be 5
          });
          gridStore.seek(function(gridStore){}, 4);
          gridStore.write(function(){}, 'y');
          gridStore.close(function() {
            dump(db, 'foobar2');

            // Unlink file (delete)
            mongo.GridStore.unlink(function(gridStore) {
              mongo.GridStore.exist(function(result) {
                sys.puts("File 'foobar2' exists: " + result);
                db.close();
              }, db, 'foobar2');            
            }, db, 'foobar2');
          });
        });
      });
    }, 'hello sailor');
  });
});

var db3 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db3.open(function(db) {
  // Metadata
  var gridStore = new mongo.GridStore(db, "foobar3", "w");
  gridStore.open(function(gridStore) {    
    gridStore.write(function(){}, 'hello, world!');
    gridStore.close(function() {
      gridStore = new mongo.GridStore(db, 'foobar3', "r");
      gridStore.open(function(gridStore) {
        sys.puts("contentType: " + gridStore.contentType);
        sys.puts("uploadDate: " + gridStore.uploadDate);
        sys.puts("chunkSize: " + gridStore.chunkSize);
        sys.puts("metadata: " + gridStore.metadata);          
      });
      
      // Add some metadata
      gridStore = new mongo.GridStore(db, 'foobar3', "w+");
      gridStore.open(function(gridStore) {
        gridStore.contentType = 'text/xml';
        gridStore.metadata = {'a':1};
        gridStore.close(function() {
          // Print the metadata
          gridStore = new mongo.GridStore(db, 'foobar3', "r");
          gridStore.open(function(gridStore) {
            sys.puts("contentType: " + gridStore.contentType);
            sys.puts("uploadDate: " + gridStore.uploadDate);
            sys.puts("chunkSize: " + gridStore.chunkSize);
            sys.puts("metadata: " + gridStore.metadata);          
            db.close();
          });            
        });
      });        
    });
  });
  
  // You can also set meta data when initially writing to a file
  // setting root means that the file and its chunks are stored in a different root
  // collection: instead of gridfs.files and gridfs.chunks, here we use
  // my_files.files and my_files.chunks      
  var gridStore = new mongo.GridStore(db, "foobar3", "w", {'content_type':'text/plain', 
    'metadata':{'a':1}, 'chunk_size': 1024*4, 'root':'my_files'});
  gridStore.open(function(gridStore) {    
    gridStore.write(function(){}, 'hello, world!');
    gridStore.close(function() {
    });
  });
});

function dump(db, filename, callback) {
  mongo.GridStore.read(function(data) {
    sys.puts(data);
    if(callback != null) callback();
  }, db, filename); 
}