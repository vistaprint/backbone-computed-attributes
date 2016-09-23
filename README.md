# Backbone Computed Attributes Mixin

This mixin allows you to create composite attribute for standard Backbone models.    

Specifying a getter allows computing an attribute value based on multiple bindings to other attributes across contexts.  This allows an attribute to have a function value and then use get to retrieve the evaluated function result, instead of evaluating the function when requested. You cannot specify a computed setter. 

When a change is triggered on any of the specified bindings, the value will be recomputed and cached unless the `nocache` attribute is set to true in the definition of the computed attribute.

Destroying a model using computed attributes will cause all computed attribute bindings to be removed.

## Usage

You can add the mixin to an individual model prototype to make it available:

```javascript
_.extend(MyModel.prototype, Backbone.ComputedAttributeMixin);
```

There are then two ways of binding computed attributes:


### Via `createComputedAttribute` function arguments
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

### Via `computed` hash and calling `createComputedAttribute`
```javascript
var Rectangle = Backbone.Model.extend({

    initialize: function(){
        this.createComputedAttributes();
    },

    computed: {
        "area" : {
            bindings: function() {
				// bind to the properties `height` and `width` on self
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
				// alternate syntax to binding to self
                return ["height", "width"];
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

If `this.createComputedAttributes()` is called in `initialize` the computed attributes will be immediately available through the `get` method of Backbone.Model:
```javascript
var rectangle = new Rectangle({width: 5, height, 10});
rectangle.get("area");
```

Where the property area will be recomputed every time the width or height is updated and the new result will be cached.

## Advanced Usage

### `Backbone.atomic` to batch changes

If you want to make multiple changes to backing properties before a computed attribute is recalculated the `Backbone.atomic` function can be used to batch those changes.  

For example, in the case above, changing height and then width one after the other would cause `area` to be re-computed twice (and in turn, all handlers listening to `area` would also be fired twice). This could have large performance implications depending on the structure of your application.

```javascript
Backbone.atomic(function() {
    Rectangle.set("height", 5);
    Rectangle.set("width", 10);
});
```

### Circular references

Currently this mixin has no protection against circular references, so be sure to attempt to avoid these cases.

### Binding 
You are not restricted to a single model binding or to binding only to the current Model.  Multiple models can be passed in as an array and any model that can be accessed from the computing models context can be used.

```javascript
	this.createComputedAttribute({
			attr: "Z",
			get: function()
			{
				return this.get("X") + this.get("Y");
			},
			bindings:
				[{ model: this, attribute: "X" },
				 { model: this.parent, attribute: "Y"}]
		});
```

### Binding to collections
You also have the ability to bind to a collection. Instead of binding to attribute changes on a model you can bind to attribute changes on all the models of a collection. This will also handle the cases for when models are added to and removed from the collection or the collection is reset

```javascript
	this.createComputedAttribute({
			attr: "tallestChild",
			get: function()
			{
				return this.get("childModels").max(function(child) {
					return child.get("height");
				});
			},
			bindings:
				[{ collection: this.get("childModels"), attribute: "height" },
		});
```

In the example above, when the attribute 'height' is changed on any of the the childModels, the tallestChild computed attribute is recalculated.

You can also take in an array of attributes to bind to  on the children by using 'attributes: ["height", "width"]' in your bindings

### Test
```javascript
npm install
npm run test
```

## Origin

Backbone Computed Attributes was written at [Vistaprint](http://www.vistaprint.com).

Vistaprint empowers more than 15 million micro businesses and consumers annually with affordable, professional options to make an impression. With a unique business model supported by proprietary technologies, high-volume production facilities, and direct marketing expertise, Vistaprint offers a wide variety of products and services that micro businesses can use to expand their business. A global company, Vistaprint employs over 4,100 people, operates more than 25 localized websites globally and ships to more than 130 countries around the world. Vistaprint's broad range of products and services are easy to access online, 24 hours a day at www.vistaprint.com.
