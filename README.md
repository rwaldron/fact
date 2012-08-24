# Fact

### Observable, Event Emitting data objects w/ Object.observe and EventEmitter2 in 2.4k


Includes an updated EventEmitter2 that uses a `WeakMap` to store all event data, preventing instance pollution. Instance data mutation is monitored via`Object.observe`.

## Getting Started
`Object.observe` is still in spec development and subject to change. Thankfully, Rafael Weinstein (one of the authors) has made a special build of v8 available as well as a built Chromium to try it out:

[Get that here](https://github.com/rafaelw/v8)


Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/rwldrn/datatype/master/dist/datatype.min.js
[max]: https://raw.github.com/rwldrn/datatype/master/dist/datatype.js

In your web page:

```html
<script src="fact.min.js"></script>
<script>

var user, User;

// Declare an observable, event emitting data object
// that represents a user
User = new Fact({
  first: null,
  last: null,
  id: null,
  fullName: function() {
    return this.first + " " + this.last;
  }
});

// Construct a new new instance of User
user = new User({
  first: "Rick",
  last: "Waldron",
  id: 1
});

user.on("change", function( event ) {

  console.log( "What Changed? ", event.name );
  console.log( "How did it change? ", event.type );
  console.log( "What is the new value? ", event.object[ event.name ] );

});


user.loggedIn = Date.now();

/*
What Changed?  loggedIn
How did it change?  new
What is the new value?  1345768324517
 */

user.first = "Richard";

/*
What Changed?  first
How did it change?  updated
What is the new value?  Richard
 */

user.loggedOut = Date.now();


/*
What Changed?  loggedOut
How did it change?  new
What is the new value?  1345768411891
 */


</script>
```

## Documentation

Create a `Fact`:
```js
var User = new Fact({
  first: null,
  last: null,
  id: null,
  fullName: function() {
    return this.first + " " + this.last;
  }
});
```

Use the `Fact`:
```js
user = new User({
  first: "Rick",
  last: "Waldron",
  id: 1
});
```

Listen to the `Fact`:

...For **change**
```js
user.on("change", function( event ) {

  console.log( "What Changed? ", event.name );
  console.log( "How did it change? ", event.type );
  console.log( "What is the new value? ", event.object[ event.name ] );

});
```

...For **new**
```js
user.on("new", function( event ) {
  console.log( "What's new? ", event.name );
  console.log( "What is the new value? ", event.object[ event.name ] );
});
```

...For **updated**
```js
user.on("updated", function( event ) {
  console.log( "What was updated? ", event.name );
  console.log( "What is the new value? ", event.object[ event.name ] );
});
```

...For **deleted**
```js
user.on("deleted", function( event ) {
  console.log( "What was deleted? ", event.name );
});
```





## Examples
_(Coming soon)_

## Contributing
All contributions must adhere to the [Idiomatic.js Style Guide](https://github.com/rwldrn/idiomatic.js),
by maintaining the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

_Also, please don't edit files in the "dist" subdirectory as they are generated via grunt. You'll find source code in the "src" subdirectory!_

## Release History
v0.1.0

## License
Copyright (c) 2012 Rick Waldron
Licensed under the MIT licenses.
