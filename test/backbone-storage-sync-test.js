/* jshint node:true, expr:true */
/* global describe,beforeEach,it */

var _ = require('lodash');
var Backbone = require('backbone');
var expect = require('chai').expect;
var sinon = require('sinon');

var StorageSyncMixin = require('../backbone-storage-sync');

describe('StorageSyncMixin', function () {

    // Mock $.Deferred for testing (since node.js test environment can't use jQuery).
    Backbone.$ = {};
    Backbone.$.Deferred = function () {
        return {
            _state: 'pending',
            resolve: function () { this._state = 'resolved'; }, 
            reject: function () { this._state = 'rejected'; }, 
            state: function () { return this._state; }
        };
    };

    describe('Mixed into a Backbone Model', function () {
        var StoredModel, syncKey = 'test', syncStore;
        
        beforeEach(function () {
            // populate syncStore with test data
            syncStore = {};
            syncStore[syncKey] = JSON.stringify({ 'id': 'test', 'saved': 'data', 'nested': { 'key1': 'value1' } });

            StoredModel = Backbone.Model.extend({
                syncStore: syncStore,
                syncKey: syncKey
            }).extend(StorageSyncMixin);
        });

        it('should exist', function () {
            expect(StoredModel).to.not.be.null;
        });
    
        it('should instantiate', function () {
            // act
            var storedModel = new StoredModel();

            expect(storedModel).to.not.be.null;
        });

        describe('sync', function () {
            it('should throw ReferenceError if syncStore is not defined', function () {
                var InvalidModel = Backbone.Model.extend({
                    syncKey: 'foo'
                }).extend(StorageSyncMixin);
                var invalidModel = new InvalidModel();

                expect(function () {
                    // act
                    invalidModel.sync('read');                    
                }).to.throw(ReferenceError);
            });

            it('should throw ReferenceError if syncKey is not defined', function () {
                var InvalidModel = Backbone.Model.extend({
                    syncStore: 'bar'
                }).extend(StorageSyncMixin);
                var invalidModel = new InvalidModel();

                expect(function () {
                    // act
                    invalidModel.sync('read');                    
                }).to.throw(ReferenceError);
            });

            it('should throw ReferenceError if method argument is missing', function () {
                var storedModel = new StoredModel();

                expect(function () {
                    // act
                    storedModel.sync();                   
                }).to.throw(ReferenceError);
            });

            it('should return deferred object', function () {
                var storedModel = new StoredModel();

                // act
                var actual = storedModel.sync('read');

                // Note: can't check instanceof Backbone.$.Deferred because it is a factory method
                expect(actual.promise).to.be.defined;
            });

            it('should return a pending deferred object', function () {
                var storedModel = new StoredModel();

                // act
                var actual = storedModel.sync('read');

                expect(actual.state()).to.equal('pending');
            });

            it('should resolve deferred object', function (done) {
                var storedModel = new StoredModel();

                // act
                var actual = storedModel.sync('read');

                _.defer(function () {
                    expect(actual.state()).to.equal('resolved');
                    done();
                });
            });

            it('should get value of syncStore at runtime', function (done) {
                var syncStoreFunction = sinon.spy(function () { return syncStore; });
                StoredModel.prototype.syncStore = syncStoreFunction;
                var storedModel = new StoredModel();

                // act
                storedModel.sync('read');

                _.defer(function () {
                    expect(syncStoreFunction).to.have.been.calledOnce;
                    done();
                });
            });

            it('should get value of syncKey at runtime', function (done) {
                var syncKeyFunction = sinon.spy(function () { return syncKey; });
                StoredModel.prototype.syncKey = syncKeyFunction;
                var storedModel = new StoredModel();

                // act
                storedModel.sync('read');

                _.defer(function () {
                    expect(syncKeyFunction).to.have.been.calledOnce;
                    done();
                });
            });
            
            it('should trigger "request" event', function () {
                var storedModel = new StoredModel();
                var spy = sinon.spy();
                storedModel.once('request', spy);

                // act
                storedModel.sync('read');

                expect(spy.calledOnce).to.be.true;
            });
        });

        describe('fetch', function () {
            it('should make isNew() return false', function (done) {
                var storedModel = new StoredModel();

                // sanity check
                expect(storedModel.isNew()).to.be.true;

                // act
                storedModel.fetch();

                _.defer(function () {
                    expect(storedModel.isNew()).to.be.false;
                    done();
                });
            });

            it('should call success callback', function (done) {
                var success = sinon.spy();
                var storedModel = new StoredModel();

                // act
                storedModel.fetch({ success: success });

                _.defer(function () {
                    expect(success).to.have.been.calledOnce;
                    done();
                });
            });

            it('should call error callback', function (done) {
                var error = sinon.spy();
                var storedModel = new StoredModel();

                // remove the key from the object store so that `fetch` fails
                delete storedModel.syncStore[syncKey];

                // act
                storedModel.fetch({ error: error });

                _.defer(function () {
                    expect(error).to.have.been.calledOnce;
                    done();
                });
            });

            it('should resolve deferred object', function (done) {
                var storedModel = new StoredModel();

                // act
                var actual = storedModel.fetch();

                _.defer(function () {
                    expect(actual.state()).to.equal('resolved');
                    done();
                });
            });

            it('should reject deferred object if syncKey property is missing from syncStore', function (done) {
                var storedModel = new StoredModel();

                // remove the key from the object store so that `fetch` fails
                delete storedModel.syncStore[syncKey];

                // act
                var actual = storedModel.fetch();

                _.defer(function () {
                    expect(actual.state()).to.equal('rejected');
                    done();
                });
            });
        });

        describe('save (create)', function () {
            var UnstoredModel;

            beforeEach(function () {
                UnstoredModel = Backbone.Model.extend({
                    syncStore: {},
                    syncKey: 'test'
                }).extend(StorageSyncMixin);
            });

            it('should save data', function (done) {
                var unstoredModel = new UnstoredModel();
                unstoredModel.set('foo', 'bar');

                // sanity check
                expect(unstoredModel.isNew()).to.be.true;

                // act
                unstoredModel.save();

                _.defer(function () {
                    var data = JSON.parse(unstoredModel.syncStore[syncKey]);
                    expect(data.foo).to.equal('bar');
                    done();
                });
            });

            it('should make isNew() return false when using the default idAttribute', function (done) {
                var unstoredModel = new UnstoredModel();

                // sanity check
                expect(unstoredModel.isNew()).to.be.true;

                // act
                unstoredModel.save();

                _.defer(function () {
                    expect(unstoredModel.isNew()).to.be.false;
                    done();
                });
            });

            it('should make isNew() return false when using custom idAttribute', function (done) {
                UnstoredModel.prototype.idAttribute = 'custom';

                var unstoredModel = new UnstoredModel();

                // sanity check
                expect(unstoredModel.isNew()).to.be.true;

                // act
                unstoredModel.save();

                _.defer(function () {
                    expect(unstoredModel.isNew()).to.be.false;
                    done();
                });
            });

            it('should call success callback', function (done) {
                var success = sinon.spy();
                var unstoredModel = new UnstoredModel();

                // act
                unstoredModel.save(null, { success: success });

                _.defer(function () {
                    expect(success).to.have.been.calledOnce;
                    done();
                });
            });

            it('should resolve deferred object', function (done) {
                var unstoredModel = new UnstoredModel();

                // act
                var actual = unstoredModel.save();

                _.defer(function () {
                    expect(actual.state()).to.equal('resolved');
                    done();
                });
            });
        });

        describe('save (update)', function () {
            it('should update existing data', function (done) {
                var storedModel = new StoredModel({ id: syncKey });
                storedModel.set('saved', 'updated');

                // act
                storedModel.save(null, { patch: true });

                _.defer(function () {
                    var data = JSON.parse(storedModel.syncStore[syncKey]);
                    expect(data.saved).to.equal('updated');
                    done();
                });
            });

            it('should patch update existing data', function (done) {
                var storedModel = new StoredModel({ id: syncKey });
                storedModel.set('saved', 'updated');

                // act
                storedModel.save();

                _.defer(function () {
                    var data = JSON.parse(storedModel.syncStore[syncKey]);
                    expect(data.saved).to.equal('updated');
                    done();
                });
            });

            it('should not remove existing data', function (done) {
                var storedModel = new StoredModel({ id: syncKey });
                storedModel.set('unrelated', 'data');

                // act
                storedModel.save();

                _.defer(function () {
                    var data = JSON.parse(storedModel.syncStore[syncKey]);
                    expect(data.saved).to.equal('data');
                    done();
                });
            });

            it('should merge existing data with new data', function (done) {
                var storedModel = new StoredModel({ id: syncKey });
                storedModel.set('nested', { unrelated: 'data' });

                // act
                storedModel.save();

                _.defer(function () {
                    var data = JSON.parse(storedModel.syncStore[syncKey]);
                    expect(data.nested).to.deep.equal({
                        key1: 'value1',
                        unrelated: 'data'
                    });
                    done();
                });
            });
        });

        describe('destroy', function () {
            it('should remove saved data', function (done) {
                var storedModel = new StoredModel({ id: syncKey });

                // act
                storedModel.destroy();

                _.defer(function () {
                    expect(storedModel.syncStore[syncKey]).to.be.undefined;
                    done();
                });
            });

            it('should make isNew() return true', function (done) {
                var storedModel = new StoredModel({ id: syncKey });

                // act
                storedModel.destroy();

                _.defer(function () {
                    expect(storedModel.isNew()).to.be.true;
                    done();
                });
            });

            it('should call success() callback if successful', function (done) {
                var success = sinon.spy();
                var storedModel = new StoredModel({ id: syncKey });

                // act
                storedModel.destroy({ success: success });

                _.defer(function () {
                    expect(success).to.have.been.calledOnce;
                    done();
                });
            });

            it('should resolve deferred object if successful', function (done) {
                var storedModel = new StoredModel({ id: syncKey });

                // act
                var actual = storedModel.destroy();

                _.defer(function () {
                    expect(actual.state()).to.equal('resolved');
                    done();
                });
            });

            it('should reject deferred object if data does not already exist in syncStore', function (done) {
                var storedModel = new StoredModel({ id: syncKey });

                // remove the key from the object store so that `fetch` fails
                delete storedModel.syncStore[syncKey];

                // act
                var actual = storedModel.destroy();

                _.defer(function () {
                    expect(actual.state()).to.equal('rejected');
                    done();
                });
            });

            it('should call error() callback if data does not already exist in syncStore', function (done) {
                var error = sinon.spy();
                var storedModel = new StoredModel({ id: syncKey });

                // remove the key from the object store so that `fetch` fails
                delete storedModel.syncStore[syncKey];

                // act
                storedModel.destroy({ error: error });

                _.defer(function () {
                    expect(error).to.have.been.calledOnce;
                    done();
                });
            });
        });
    });

    describe('Mixed into a Backbone Collection', function () {
        var StoredCollection, syncKey = 'test', syncStore, savedData;
        
        beforeEach(function () {
            // populate syncStore with test data
            syncStore = {};
            savedData = [{ first: 1 }, { second: 2 }];
            syncStore[syncKey] = JSON.stringify(savedData);

            StoredCollection = Backbone.Collection.extend({
                syncStore: syncStore,
                syncKey: syncKey
            }).extend(StorageSyncMixin);
        });

        it('should exist', function () {
            expect(StoredCollection).to.not.be.null;
        });
    
        it('should instantiate', function () {
            // act
            var storedCollection = new StoredCollection();

            expect(storedCollection).to.not.be.null;
        });

        describe('fetch', function () {
            it('should reset the collection with the saved data', function (done) {
                var storedCollection = new StoredCollection();

                // act
                storedCollection.fetch();

                _.defer(function () {
                    var actual = storedCollection.toJSON();
                    expect(actual).to.deep.equal(savedData);
                    done();
                });
            });

            it('should call set() once', function (done) {
                var set = sinon.spy(StoredCollection.prototype.set);
                StoredCollection.prototype.set = set;
                var storedCollection = new StoredCollection();

                // act
                storedCollection.fetch();

                _.defer(function () {
                    expect(set).to.have.been.calledOnce;
                    done();
                });
            });

            it('should call reset() once (if reset:true is passed)', function (done) {
                var reset = sinon.spy(StoredCollection.prototype.reset);
                StoredCollection.prototype.reset = reset;
                var storedCollection = new StoredCollection();

                // act
                storedCollection.fetch({ reset: true });

                _.defer(function () {
                    expect(reset).to.have.been.calledOnce;
                    done();
                });
            });
        });

        describe('create', function () {
            var UnstoredModel, modelKey = 'createModelKey';

            beforeEach(function () {
                UnstoredModel = Backbone.Model.extend({
                    syncStore: syncStore,
                    syncKey: modelKey
                }).extend(StorageSyncMixin);
            });

            it('should save model', function (done) {
                var collection = new Backbone.Collection(null, { model: UnstoredModel });

                // act
                collection.create({
                    'foo': 'bar'
                });

                _.defer(function () {
                    var actual = JSON.parse(syncStore[modelKey]);
                    expect(actual.foo).to.equal('bar');
                    done();
                });
            });
        });
    });
});
