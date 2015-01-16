# Backbone Computed Attributes Mixin
===========================================

This allows you to set an attribute to have a function value and then use get to retrieve the evaluated function result, rather than just the function. You cannot specify a computed setter. 

When one of the bindings changes, a change event will automatically be triggered for this property when the value changes. Generally, the cached value of the getter
will be returned, unless the `nocache` option is specified.

Destroying this model will remove all of its bindings.

## Usage
------------------
Add the mixin to your models prototype to make it available

```javascript
_.extend(MyModel.prototype, Backbone.ComputedAttributeMixin);
```

Then define your own attributes one at a time at initialization

```javascript
 var MyModel = Backbone.Model.extend({

     initialize : function() {
         this.createComputedAttribute({
                 attr: "...",
                 get: function() { ... },
                 bindings: [
                     { attributes : [ ... ] },
                     { model : ..., attribute : ... }
                 ],
                 nocache: true // optional
             });
     }
 });
```

Or, add the attributes to the computed hash and simply call this.createComputedAttributes() on initialization

```javascript
var Rectangle = Backbone.Model.extend({

    initialize: function(){
        this.createComputedAttributes();
    },

    computed: {
        "area" : {
            bindings: function() {
                return [{ model: this, attributes: ["height", "width"] }];
            },
            get: function() {
                if (this.get("width") && this.get("height")) {
                    return this.get("width") * this.get("height");
                } else {
                    return 0;
                }
            }
        },
        "perimeter" : {
            bindings: function() {
                return [{ model: this, attributes: ["height", "width"] }];
            },
            get: function() {
                if (this.get("width") && this.get("height")) {
                    return this.get("width") * 2 + this.get("height") * 2;
                } else {
                    return 0;
                }
            }
        }
    }
});
```


Then all you need to do is call 
```javascript
var rectangle = new Rectangle({width: 5, height, 10});
rectangle.get("area");
```
Every time the width or height is updated the result will be cached and calling get will return the cached result until the next time width or height is changed and the area is recomputed


## Tips
------------------
Sometimes you may run into the case where you need to make multiple changes to a models attributes and computed attributes are bound to many of those. This may cause a handler to fire on the change of a computed attribute before all your changes were made. We can use the atomic function to get around this.

For example if we want to change both the width and height as seen above and we have a listener to changes on the area - the listener will get triggered twice - once when the width changes and again when the height changes. 

To avoid this we can defer the triggering of any computed attribute changes using this atomic function. Just wrap any calls you want to make in a function passes to Backbone.atomic and you are all set.

```javascript
Backbone.atomic(function() {
    Rectangle.set("height", 5);
    Rectangle.set("width", 10);
});
```

You don't need to bind the attributes to the same model. You can also bind them to children of the model if you would like. See unit tests for examples.



## Origin
------------------
Backbone Computed Attributes was written at [Vistaprint](http://www.vistaprint.com).

Vistaprint empowers more than 15 million micro businesses and consumers annually with affordable, professional options to make an impression. With a unique business model supported by proprietary technologies, high-volume production facilities, and direct marketing expertise, Vistaprint offers a wide variety of products and services that micro businesses can use to expand their business. A global company, Vistaprint employs over 4,100 people, operates more than 25 localized websites globally and ships to more than 130 countries around the world. Vistaprint's broad range of products and services are easy to access online, 24 hours a day at www.vistaprint.com.