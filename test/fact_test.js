/*global QUnit:false, module:false, test:false, asyncTest:false, expect:false*/
/*global start:false, stop:false ok:false, equal:false, notEqual:false, deepEqual:false*/
/*global notDeepEqual:false, strictEqual:false, notStrictEqual:false, raises:false*/
(function(window, $) {

  var Fact = window.Fact;

  module("Fact", {
    setup: function() {
      // this.elems = $("#qunit-fixture").children();
    }
  });

  test("exists and is a function", 2, function() {
    ok( Fact, "exists" );
    equal( typeof Fact, "function", "is a function" );
  });

  test("creates and returns functions", 2, function() {
    var F = new Fact();

    ok( F, "not false, '', 0, null or undefined" );
    equal( typeof F, "function", "is a function" );
  });

  test("creates a constructor", 1, function() {
    var c, C = new Fact({});

    try {
      c = new C();
      // new f();
    } catch (e) {
      ok( false, "constructing throws" );
    }

    ok( true, "constructing does not throw" );
  });

  test("inheritance", 3, function() {
    var c, C = new Fact({});

    c = new C();

    equal( typeof c.on, "function", "inherited an on method" );
    equal( typeof c.emit, "function", "inherited an emit method" );
    equal( typeof c._events, "undefined", "did not inherit an _events property");
  });

  asyncTest("emitter", 1, function() {
    var c, C = new Fact({});

    c = new C();

    c.on("test", function() {

      ok( true, "emits and handles events" );
      start();
    });

    c.emit("test");
  });

  asyncTest("observable", 7, function() {
    var c, C;

    C = new Fact({});
    c = new C();

    c.on("new", function( event ) {
      equal( event.type, "new", "observed a new property" );
      equal( event.name, "name", "property name is correct" );
      equal( event.object.name, "Rick", "property value is correct" );

      c.name = "Rose";
    });

    c.on("updated", function( event ) {

      // console.log( event );
      equal( event.type, "updated", "observed an updated property" );
      equal( event.name, "name", "property name is correct" );
      equal( event.oldValue, "Rick", "property oldValue is correct" );
      equal( event.object.name, "Rose", "property value is correct" );

      start();
    });

    c.name = "Rick";
  });

  asyncTest("computed properties", 10, function() {
    var k, c, C;

    C = new Fact({
      first: null,
      last: null,
      fullName: function() {
        return this.first + " " + this.last;
      }
    });

    c = new C({
      first: "Rick",
      last: "Waldron"
    });

    k = 0;

    c.on("updated", function( event ) {

      equal( event.type, "updated", "observed an updated property" );

      if ( k === 0 ) {
        equal( event.name, "first", "property name is correct" );
        equal( event.oldValue, "Rick", "property oldValue is correct" );
        equal( event.object.first, "Alli", "property value is correct" );
      } else {
        equal( event.name, "last", "property name is correct" );
        equal( event.oldValue, "Waldron", "property oldValue is correct" );
        equal( event.object.last, "The Dog", "property value is correct" );
      }

      if ( ++k === 2 ) {
        start();
      }
    });

    equal( c.fullName, "Rick Waldron", "computed property is correct" );

    c.first = "Alli";
    c.last = "The Dog";

    equal( c.fullName, "Alli The Dog", "computed property is correct" );
  });

  // asyncTest("computed property access", 5, function() {
  //   var k, c, C;

  //   C = new Fact({
  //     first: null,
  //     last: null,
  //     fullName: function() {
  //       return this.first + " " + this.last;
  //     }
  //   });

  //   c = new C({
  //     first: "Rick",
  //     last: "Waldron"
  //   });

  //   c.on("accessed", function( event ) {

  //     console.log( event );

  //     equal( event.type, "accessed", "observed an updated property" );
  //     equal( event.name, "fullName", "property name is correct" );
  //     equal( event.value, "Rick Waldron", "property value is correct" );
  //     equal( event.object.first, "Rick", "target object is correct" );

  //     start();
  //   });

  //   // This should trigger an "accessed" event
  //   equal( c.fullName, "Rick Waldron", "computed property is correct" );

  //   window.c = c;
  // });

  asyncTest("prototype chain", 4, function() {
    var k, a, b, C;

    C = new Fact({
      first: null,
      last: null,
      fullName: function() {
        return this.first + " " + this.last;
      }
    });

    a = new C({
      first: "Rick",
      last: "Waldron"
    });

    b = new C({
      first: "Rose",
      last: "Fortuna"
    });

    notEqual( a.fullName, b.fullName, "instances do not affect the prototype" );

    a.on("updated", function( event ) {
      equal( event.name, "first", "property name is correct" );
      equal( event.oldValue, "Rick", "property oldValue is correct" );
      equal( event.object.first, "Alli", "property value is correct" );

      start();
    });

    b.first = "Taco";
    a.first = "Alli";
  });

}(this, jQuery));


/*
  ======== A Handy Little QUnit Reference ========
  http://docs.jquery.com/QUnit

  Test methods:
    expect(numAssertions)
    stop(increment)
    start(decrement)
  Test assertions:
    ok(value, [message])
    equal(actual, expected, [message])
    notEqual(actual, expected, [message])
    deepEqual(actual, expected, [message])
    notDeepEqual(actual, expected, [message])
    strictEqual(actual, expected, [message])
    notStrictEqual(actual, expected, [message])
    raises(block, [expected], [message])
*/
