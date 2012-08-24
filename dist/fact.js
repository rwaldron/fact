/*! fact - v0.1.0 - 2012-08-23
* https://github.com/rwldrn/fact
* Copyright (c) 2012 Rick Waldron; Licensed MIT */

;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  var priv = new WeakMap();

  function init() {
    var p = priv.get(this);

    if ( !p ) {
      p = {
        _events: {
          maxListeners: defaultMaxListeners
        }
      }
    }

    priv.set(this, p);
  }


  function configure(conf) {
    var p = priv.get(this);

    if (conf) {
      conf.delimiter && (p.delimiter = conf.delimiter);
      conf.wildcard && (p.wildcard = conf.wildcard);
      if (p.wildcard) {
        p.listenerTree = new Object;
      }
    }

    priv.set(this, p);
  }

  function EventEmitter(conf) {
    init.call(this);
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {
    var p = priv.get(this);

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = new Object;
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof priv.get(this)._events.maxListeners !== 'undefined') {
              m = priv.get(this)._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  };

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    var p = priv.get(this);

    p._events.maxListeners = n;

    priv.set(this, p);
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    };

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {
    init.call(this);

    var type = arguments[0],
        p = priv.get(this);

    if (type === 'newListener') {
      if (!p._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (p._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = p._all.length; i < l; i++) {
        // // this.event = type;
        p._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!p._all &&
        !p._events.error &&
        !(p.wildcard && p.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(p.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(p.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = p._events[type];
    }

    if (typeof handler === 'function') {
      // this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        // this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return p._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }

    init.call(this);

    var p = priv.get(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(p.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!p._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      p._events[type] = listener;
    }
    else if(typeof p._events[type] === 'function') {
      // Adding the second element, need to change to array.
      p._events[type] = [p._events[type], listener];
    }
    else if (isArray(p._events[type])) {
      // If we've already got an array, just append.
      p._events[type].push(listener);

      // Check for listener leak
      if (!p._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof p._events.maxListeners !== 'undefined') {
          m = p._events.maxListeners;
        }

        if (m > 0 && p._events[type].length > m) {

          p._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        p._events[type].length);
          console.trace();
        }
      }
    }

    priv.set(this, p);
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {
    var p = priv.get(this);

    if(!p._all) {
      p._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    p._all.push(fn);

    priv.set(this, p);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[],
        p = priv.get(this);

    if(p.wildcard) {
      var ns = typeof type === 'string' ? type.split(p.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, p.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!p._events[type]) return this;
      handlers = p._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          return this;
        }

        if(p.wildcard) {
          leaf._listeners.splice(position, 1)
        }
        else {
          p._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(p.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete p._events[type];
          }
        }
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(p.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    priv.set(this, p);

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns,
        p = priv.get(this);

    if (fn && p._all && p._all.length > 0) {
      fns = p._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      p._all = [];
    }

    priv.set(this, p);
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {

    var p = priv.get(this);

    if (arguments.length === 0) {
      init.call(this);
      return this;
    }

    if(p.wildcard) {
      var ns = typeof type === 'string' ? type.split(p.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, p.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!p._events[type]) return this;
      p._events[type] = null;
    }

    priv.set(this, p);
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(p.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(p.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, p.listenerTree, 0);
      return handlers;
    }

    p._events || init.call(this);

    if (!p._events[type]) p._events[type] = [];
    if (!isArray(p._events[type])) {
      p._events[type] = [p._events[type]];
    }
    return p._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {
    var p = priv.get(this);
    if(p._all) {
      return p._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define(function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter;
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);

(function( exports ) {

  var Abstract, noNotify;

  Abstract = {
    // [[Put]] props from dictionary onto |this|
    // MUST BE CALLED FROM WITHIN A CONSTRUCTOR:
    //  Abstract.put.call( this, dictionary );
    put: function( dictionary ) {
      dictionary = Object(dictionary);

      // For each own property of src, let key be the property key
      // and desc be the property descriptor of the property.
      Object.getOwnPropertyNames( dictionary ).forEach(function( key ) {
        this[ key ] = dictionary[ key ];
      }, this);
    },
    assign: function( O, dictionary ) {
      return Abstract.put.call( O, dictionary );
    }
  };

  // Fact is wrapper that allows us to create
  // a new "Fact" of our own by closing over the
  // |setup| object
  function Fact( setup ) {

    function Data( dict ) {
      var descriptor;

      // Initialize descriptor as an empty object
      descriptor = {};

      // Do an assignment "merge" of instance dict onto closed over
      // setup
      Abstract.assign( setup, dict );

      // Enumerate the setup object, define data keys
      // and create descriptors for "computed" properties
      Object.keys( setup ).forEach(function( key ) {

        // Assume properties with function definitions
        // are "computed" accessor properties (|get|)
        if ( typeof setup[ key ] === "function" ) {
          descriptor[ key ] = {
            get: setup[ key ]
          };
        }
        // [[Put]] instance property values onto |this|
        else {
          this[ key ] = setup[ key ];
        }
      }, this);

      // Define properties for "computed" accessors
      Object.defineProperties( this, descriptor );

      // Observer changes, pipe change record data out
      // to public event handlers
      Object.observe( this, function( changes ) {

        changes.forEach(function( change ) {

          // Emit an event for the specific
          // change type
          this.emit( change.type, change );

          // Emit a generic "change" event for
          // for all change types
          this.emit( "change", change );

        }, this);
      }.bind(this));
    }

    // Inherit EventEmitter(2)
    Data.prototype = Object.create( EventEmitter2.prototype );

    // Set the constructor as Data. (Without this,
    // the constructor appears as "EventEmitter")
    Data.prototype.constructor = Data;

    // Return the newly defined Data constructor
    return Data;
  }

  exports.Fact = Fact;
}(this));