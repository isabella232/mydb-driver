
var expect = require('expect.js');
var mydb = require('..');
var redis = require('redis');

describe('mydb-driver', function(){

  describe('`op` event', function(){
    var db = mydb('localhost/mydb-driver-test', { redis: false });
    var users = db.get('users');

    it('should export `Collection`', function(){
      expect(users).to.be.a(mydb.Collection);
    });

    it('should work with updates', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.update({ _id: user._id }, { $set: {} });
        users.once('op', function(id, query, op){
          expect(id).to.equal(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $set: {} });
          done();
        });
      });
    });

    it('should not be emitted when errors occur', function(done){
      var col = db.get('users-' + Date.now());
      col.insert({ a: [1, 2] }, function(err, user){
        expect(err).to.be(null);
        col.update({ _id: user._id }, { $pull: { a: 1 }, $push: { a: 3 } }, function(err){
          expect(err).to.be.an(Error);
          done();
        });
        col.once('op', function(){
          done(new Error('Invalid test'));
        });
      });
    });

    it('should work with updates and positional op', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.update({ _id: user._id, 'test.a': 'b' }, { 'test.$.a': 'c' }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({ 'test.a': 'b' });
          expect(op).to.eql({ 'test.$.a': 'c' });
          done();
        });
      });
    });

    it('should work with updates (shorthand)', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.update(user._id, { $pull: { a: 'woot' } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });

    it('should work with updates (shorthand#2)', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.update(user._id.toString(), { $pull: { a: 'woot' } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });

    it('should work with findAndModify', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.findAndModify({ query: { _id: user._id.toString() }, update: { $pull: { a: 'woot' } } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });

    it('should work with findAndModify (shorthand)', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.findAndModify({ query: user._id.toString(), update: { $pull: { a: 'woot' } } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });

    it('should work with findAndModify (shorthand#2)', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.findAndModify({ _id: user._id.toString() }, { $pull: { a: 'woot' } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });

    it('should work with findAndModify (shorthand#3)', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.findAndModify(user._id.toString(), { $pull: { a: 'woot' } }, function(err){
          expect(err).to.be(null);
        });
        users.once('op', function(id, query, op){
          expect(id).to.be(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $pull: { a: 'woot' } });
          done();
        });
      });
    });
  });

  describe('redis', function(){
    var db = mydb('localhost/mydb-driver-test');
    var users = db.get('users');

    var sub = redis.createClient();

    it('should get ops published', function(done){
      users.insert({}, function(err, user){
        expect(err).to.be(null);
        users.update({ _id: user._id }, { $set: {} });
        sub.subscribe(user._id.toString());
        sub.on('message', function(channel, msg){
          expect(channel).to.be(user._id.toString());
          var obj = JSON.parse(msg);
          expect(obj[0]).to.eql({});
          expect(obj[1]).to.eql({ $set: {} });
          done();
        });
        users.on('op', function(id, query, op){
          expect(id).to.equal(user._id.toString());
          expect(query).to.eql({});
          expect(op).to.eql({ $set: {} });
        });
      });
    });
  });

});