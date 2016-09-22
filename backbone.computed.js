// **ComputedAttributeMixin**

// This allows you to set an attribute to have a function value and then use
// get to retrieve the evaluated function result, rather than just the function. You 
// cannot specify a computed setter.

// When one of the bindings changes, a change event will automatically be triggered
// for this property when the value changes. Generally, the cached value of the getter
// will be return, unless the `nocache` option is specified.

// Destroying this model will remove all of its bindings.

// Usage:

//     var MyModel = Backbone.Model.extend({
//  
//         initialize : function() {
//             this.createComputedAttribute({
//                     attr: "...",
//                     get: function() { ... },
//                     bindings: [
//                         { attributes : [ ... ] },
//                         { model : ..., attribute : ... }
//                     ],
//                     nocache: true // optional
//                 });
//         }
//     });
(function(factory) {

    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self == "object" && self.self == self && self) ||
              (typeof global == "object" && global.global == global && global);

    // Set up Backbone appropriately for the environment. Start with AMD.
    if (typeof define === "function" && define.amd) {
      define(["underscore", "backbone", "exports"], function(_, Backbone, exports) {
        return factory(root, exports, _, Backbone);
      });

    // Next for Node.js or CommonJS. jQuery may not be needed as a module.
    } else if (typeof exports !== "undefined") {
      factory(root, exports, require("underscore"), require("backbone"));
    } else {
      factory(root, {}, _, Backbone);
    }
}(function(root, BackboneComputedAttributeMixin, _, Backbone) {
    var _computedChangeQueue = [];
    var _atomic = false;

    // This one time setup method will override Backbone's setter. This is only called
    // once we're sure that computed properties are in use.
    var setupComputedAttributes = _.once(function() {
        var _set = Backbone.Model.prototype.set;
        Backbone.Model.prototype.set = function() {
            var i, j, k, l;
            var recomputing = this._recomputing;
            this._recomputing = true;

            // Actually set this attribute, allowing all change events to fire.
            var retValue = _set.apply(this, arguments);

            // If any models are dependent on a changed attribute, notify them of the change. I'm not using
            // events here because I need to call this regardless of whether silent is true,
            // and I also don't want to bother with things getting piped through the event
            // infrastructure.
            if (this._dependsOnMe) {
                var keys = _.keys(this.changedAttributes() || {});
                for (i = 0, l = keys.length; i < l; i++) {
                    var dependsOnMe = this._dependsOnMe[keys[i]];
                    if (dependsOnMe) {
                        for (j = 0, k = dependsOnMe.length; j < k; j++) {
                            var dep = dependsOnMe[j];
                            dep.model._changeDependency(dep.attr);
                        }
                    }
                }
            }

            // Once per call stack, we want to clear out the queue of possibly changed computed attributes.
            // We will recompute + cache them, and trigger change events if they've changed.
            if (!recomputing) {
                _flushComputedChangeQueue();
                this._recomputing = false;
            }

            return retValue;
        };
    });
    
    var _flushComputedChangeQueue = function() {
        if (_atomic) {
            return;
        }

        // This is a while loop because in theory we could trigger a change event that causes
        // another property to get set that will then push more models into the queue.
        while (_computedChangeQueue.length) {
            var model = _computedChangeQueue.pop();
            var changed = false;
            model.changed = {}; // TODO Circular test!
            for (var computedAttr in model._changedComputedAttributes) {
                var oldVal = model._changedComputedAttributes[computedAttr];
                delete model._changedComputedAttributes[computedAttr];
                var newVal = model.get(computedAttr);
                if (newVal !== oldVal) {
                    
                    //backbone resets the list of previous attributes after change to the static attributes, so let's keep our own list
                    if (!model._previousComputedAttributes) {
                        model._previousComputedAttributes = {};
                    }
                    
                    model._previousComputedAttributes[computedAttr] = oldVal;
                    model.changed[computedAttr] = newVal;
                    model.trigger("change:" + computedAttr, model);
                    changed = true;
                }
            }
            if (changed) {
                model.trigger("change", model);
            }
        }

        _computedChangeQueue = [];
    };

    Backbone.atomic =  function(fn, context) { 
        if (_atomic) {
            throw new Error("Computed attributes are already in atomic mode (they won't be updated until the first function that called this is complete).");
        }
        _atomic = true;
        try {
            fn.apply(context || this);
        } catch(e) {
            throw e;
        // Don't leave the application in atomic mode, just because the function failed.
        } finally {
            _atomic = false;
        }
        _flushComputedChangeQueue();
    };

    BackboneComputedAttributeMixin._changeDependency = function(attr) {
        if (!_.contains(_computedChangeQueue, this)) {
            _computedChangeQueue.push(this);
        }
        
        // Set a flag so that the value is recomputed next time get() is called.
        this._dirty[attr] = true;
        
        // We need to keep track of the current value of each attribute so that we know 
        // whether or not to trigger change events once we enter the recomputing state.
        if (!this._changedComputedAttributes) {
            this._changedComputedAttributes = {};
        }
        this._changedComputedAttributes[attr] = this._cachedAttributes[attr];

        // Recursively see if any other models are depending on my affected attributes.
        if (this._dependsOnMe && this._dependsOnMe[attr]) {
            var dependsOnMe = this._dependsOnMe[attr];
            for (var j = 0, k = dependsOnMe.length; j < k; j++) {
                var dep = dependsOnMe[j];
                dep.model._changeDependency(dep.attr);
            }
        }
    };


    // Override `get` so that we call the computed function for this attribute.
    BackboneComputedAttributeMixin.get = function(attr) {
        var computed = this._computed && this._computed[attr];
        if (computed) {
            if (this._dirty[attr] || computed.nocache) {
                this._cachedAttributes[attr] = computed.get.call(this);
                delete this._dirty[attr];
            }
            return this._cachedAttributes[attr];
        }
        return this.attributes[attr];
    };
        
    BackboneComputedAttributeMixin.previous = function(attr) {
        if (attr == null) return null;

        var computed = this._computed && this._computed[attr];
        if (computed) {
            if (!this._previousComputedAttributes) return null;
            return this._previousComputedAttributes[attr];
        }

        if (!this._previousAttributes) return null;
        return this._previousAttributes[attr];
    };
        
    BackboneComputedAttributeMixin.previousAttributes = function () {
        if (!this._previousAttributes && !this._previousComputedAttributes) {
            return null;
        }

        return _.extend(_.clone(this._previousAttributes) || {}, _.clone(this._previousComputedAttributes));
    };

    BackboneComputedAttributeMixin.destroy = function() {
        Backbone.Model.prototype.destroy.apply(this, arguments);
        this.removeComputedAttributes();
    };

    // `createComputedAttributes` can be called when a model is initialized and it
    // will take all of the attributes in the model's `computed` hash, and turn
    // them into attributes.
    BackboneComputedAttributeMixin.createComputedAttributes = function() {
        if (this.computed) {
            for (var attr in this.computed) {
                var val = this.computed[attr];
                this.createComputedAttribute({
                    attr: attr,
                    get: val.get,
                    bindings: val.bindings.call(this),
                    nocache: val.nocache
                });
            }
        }

        if (!this._computed) {
            this._computed = {};
        }
    };

    BackboneComputedAttributeMixin.createComputedAttribute = function(options) {
        setupComputedAttributes();
        
        if (!this._dependencies) {
            this._dependencies = {};
            this._dirty = {};
            this._cachedAttributes = {};
        }

        var computedAttr = options.attr;

        // Mark as dirty the first time so that the value is calculated no matter what.
        this._dirty[computedAttr] = true;

        // There are lots of different ways of specifying bindings.
        for (var i = 0, l = options.bindings.length; i < l; i++) {
            var binding = options.bindings[i];
            var attrs, model;

            // If a collection was passed in, createComputedAttributes for each of its models
            if (binding.collection) {
                this.createComputedAttributeForCollection(binding, options);
                return;
            }
            if (_.isString(binding)) {
                attrs = [binding];
                model = this;
            }
            else if (_.isArray(binding)) {
                attrs = binding;
                model = this;
            }
            else if (binding.attribute) {
                attrs = [binding.attribute];
                model = binding.model || this;
            }
            else if (binding.attributes) {
                attrs = binding.attributes;
                model = binding.model || this;
            }
            else {
                throw new Error("Attribute binding not defined correctly");
            }

            // This dependencies collection is just for storing references to the models that I depend on,
            // which we need in order to clean up correctly when this model is destroyed.
            var deps = this._dependencies[model.cid];
            if (!deps) {
                deps = this._dependencies[model.cid] = { model: model, attrs: {} };
            }

            // Add a two way link for each model - one to the dependent model so that if its attributes
            // are set, this will be notified. And one in the other direction so that these dependencies
            // can be removed when this is destroyed.
            for (var j = 0; j < attrs.length; j++) {
                var attr = attrs[j];
                if (attr == computedAttr && model == this) {
                    throw new Error("Cannot create a computed attribute that depends on itself");
                }

                if (!model._dependsOnMe) {
                    model._dependsOnMe = {};
                }
                if (!model._dependsOnMe[attr]) {
                    model._dependsOnMe[attr] = [];
                }
                model._dependsOnMe[attr].push({ model: this, attr: computedAttr });
                deps.attrs[attr] = true;
            }
        }

        // Store our getter and bindings privately so that we can access them later.
        if (!this._computed) {
            this._computed = {};
        }
        this._computed[computedAttr] = { get: options.get, bindings: options.bindings, nocache: options.nocache };
    };

    BackboneComputedAttributeMixin.createComputedAttributeForCollection =  function(binding, options) {
        var addBindings = _.bind(function(newModels) {
            newBindings = _.map(newModels, function(model){
                return {
                    attributes: binding.attribute ? [binding.attribute] : binding.attributes, // Only accept binding.attributes/attribute
                    model: model
                };
            });

            this.createComputedAttribute({
                attr: options.attr,
                get: options.get,
                bindings: newBindings,
                nocache: options.nocache
            });
        }, this);

        // When the viewModel is first initialized add bindings to all of the viewModels
        addBindings(binding.collection.models);
        
        // When a collection is reset, add bindings for all of the new models added
        // and recompute the attribute
        binding.collection.on("reset", _.bind(function(collection, opt){
            var newModels = _.difference(collection.models, opt.previousModels);
            addBindings(newModels);
            this._changeDependency(options.attr);
            _flushComputedChangeQueue();
        }, this));

        // When a model is added, attach bindings to the it and recompute the attribute
        binding.collection.on("add", _.bind(function(newModel) {
            addBindings([newModel]);
            this._changeDependency(options.attr);
            _flushComputedChangeQueue();
        }, this));

        // When a model is removed, recompute the attribute
        binding.collection.on("remove", _.bind(function(model){
            this._changeDependency(options.attr);
            _flushComputedChangeQueue();
        }, this))

        return;
    };

    // When a model is destroyed, we can use its list of dependencies to find all of the other
    // models that it is bound to, and we can remove references from those models so that it
    // can be thoroughly cleaned up.
    BackboneComputedAttributeMixin.removeComputedAttributes = function() {
        _.each(this._dependencies, function(dep) {
            _.each(dep.attrs, function(val, attr) {
                var dependsOnMe = dep.model._dependsOnMe[attr];
                if (dependsOnMe) {
                    var retain = dep.model._dependsOnMe[attr] = [];
                    for (var j = 0, k = dependsOnMe.length; j < k; j++) {
                        if (dependsOnMe[j].model !== this) {
                            retain.push(dependsOnMe[j]);
                        }
                    }
                    if (!retain.length) {
                        delete dep.model._dependsOnMe[attr];
                    }
                }
            }, this);
        }, this);
    };

    Backbone.ComputedAttributeMixin = BackboneComputedAttributeMixin;
    return BackboneComputedAttributeMixin;
}));
