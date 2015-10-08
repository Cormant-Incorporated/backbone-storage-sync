# backbone-storage-sync

A mixin for Backbone.sync to synchronize to session or local storage instead of a remote server. 

Usage: 

  1. Mix this object into a Backbone Model (or Collection) using `Backbone.Model.extend(StorageSyncMixin)` (or `Backbone.Collection.extend(StorageSyncMixin)`). 
  2. Define `syncStore` and `syncKey` within the Backbone Model (or Collection):
    - `syncStore` is an object to sync to, such as `window.sessionStorage`. May be a string or function. 
    - `syncKey` is the property of the object to sync to. May be a string or function. 
      For Backbone Models, this will be used as the model identifier (defined by `idAttribute`).
  3. Utilize Backbone Sync methods as normal. `fetch`, `save`, `destroy`, `create`, and `sync` are all supported. 
