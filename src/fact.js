/*
 * Fact
 * https://github.com/rwldrn/Fact
 *
 * Copyright (c) 2012 Rick Waldron
 * Licensed under the MIT, GPL licenses.
 */

(function( exports ) {

  var Abstract = {
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
            get: function() {
              var value = setup[ key ].call(this);

              this.emit( "accessed", {
                name: key,
                type: "accessed",
                value: value,
                object: this
              });

              return value;
            }
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
