(function (factory) {
    'use strict';
    
    if (typeof define === 'function' && define.amd) {
        define(['backbone', 'lodash'], factory);
    }
    else if (typeof exports !== 'undefined') {
        module.exports = exports = factory(require('backbone'), require('lodash'));
    }
    else {
        factory(Backbone, _);
    }
})(function (Backbone, _) {
    'use strict';
    
    var syncMethods = {
        
        // Overwrites object store with current instance data.
        create: function (instance, options, deferred) {
            if (instance instanceof Backbone.Model) {
                // Set the instance `idAttribute` to the `syncKey` so that `isNew()` behaves as expected.
                instance.set(instance.idAttribute, _.result(this, 'syncKey'));
            }

            var json = instance.toJSON();
            var data = JSON.stringify(json);
            this._syncSet(data);

            options.success.call(options.context, instance, json, options);
            deferred.resolve(json);
        },
        
        // Returns the parsed JSON of the object store.
        read: function (instance, options, deferred) {
            var data = this._syncGet();
            if (!data) {
                // Can't parse empty value as json. 
                options.error.call(options.context, json);
                deferred.reject(data);
                return;
            }

            var json = JSON.parse(data);

            options.success.call(options.context, json);
            deferred.resolve(json);
        },
        
        // Merges object store with current instance data.
        update: function (instance, options, deferred) {
            var defaultStr = instance instanceof Backbone.Model ? JSON.stringify({}) : JSON.stringify([]),
                storedData = this._syncGet() || defaultStr,
                json = _.merge(JSON.parse(storedData), instance.toJSON());

            var data = JSON.stringify(json);
            this._syncSet(data);

            options.success.call(options.context, json);
            deferred.resolve(json);
        },
        
        // Merges object store with current instance data (same as "update", for now).
        patch: function (instance, options, deferred) {
            var defaultStr = instance instanceof Backbone.Model ? JSON.stringify({}) : JSON.stringify([]),
                storedData = this._syncGet() || defaultStr,
                json = _.merge(JSON.parse(storedData), instance.toJSON());

            var data = JSON.stringify(json);
            this._syncSet(data);

            options.success.call(options.context, json);
            deferred.resolve(json);
        },
        
        // Removes data from the object store.
        delete: function (instance, options, deferred) {
            var dataExists = this._syncGet(),
                json;// `json` is left `undefined` because the data is deleted from the object store.

            if (dataExists) {
                this._syncSet(undefined);
                instance.unset(instance.idAttribute);
                options.success.call(options.context, json);
                deferred.resolve(json);
            }
            else {
                options.error.call(options.context, json);
                deferred.reject(json);
            }
        }
        
    };
    
    return {
        
        // Backbone Overrides
        // ------------------
        
        // Synchronizes this Backbone model or collection with `syncStore`. 
        sync: function (method, instance, options) {
            var syncMethod = syncMethods[method];
            if (!syncMethod) {
                throw(new ReferenceError('"method" must be defined'));
            }

            instance = instance || this;

            options = options || {};
            _.defaults(options, {
                success: _.noop,
                error: _.noop,
                context: instance,
                parse: true
            });

            if (!this.syncKey) {
                throw(new ReferenceError('"syncKey" must be defined'));
            }

            if (!this.syncStore) {
                throw(new ReferenceError('"syncStore" must be defined'));
            }

            var deferred = Backbone.$.Deferred();

            // Defer sync'ing to emulate default sync behavior. 
            _.defer(syncMethod.bind(this, instance, options, deferred));

            instance.trigger('request', instance, deferred, options);

            return deferred;
        },

        // Private Methods
        // ---------------

        // Returns the value of the object store as unparsed JSON. 
        _syncGet: function () {
            var syncKey = _.result(this, 'syncKey');
            var syncStore = _.result(this, 'syncStore');
            return syncStore[syncKey];
        },

        // Sets the object store to `value` (which should be stringified JSON).
        _syncSet: function (value) {
            var syncKey = _.result(this, 'syncKey');
            var syncStore = _.result(this, 'syncStore');
            syncStore[syncKey] = value;
        }
    };
});