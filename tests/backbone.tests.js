$(document).ready(function()
{
    module("Backbone.ComputedAttributeMixin");

    // Basic Tests.

    var TestModel = Backbone.Model.extend({

        initialize: function()
        {
            this.createComputedAttribute({
                attr: "Z",
                get: function()
                {
                    return this.get("X") + this.get("Y");
                },
                bindings:
                    [{ model: this, attribute: "X" },
                     { model: this, attribute: "Y"}]
            });
        },

        defaults: {
            "X": 1,
            "Y": 2
        }
    });
    _.extend(TestModel.prototype, Backbone.ComputedAttributeMixin);

    test("initialize and get computed attribute", 1, function()
    {
        var test = new TestModel();
        equal(test.get("Z"), 3);
    });

    test("set dependency and get computed attribute", 1, function()
    {
        var test = new TestModel();
        test.set("X", 2);
        equal(test.get("Z"), 4);
    });

    test("bind to computed attribute and set dependency", 1, function()
    {
        var test = new TestModel();
        test.on("change:Z", function() { equal(test.get("Z"), 5); });
        test.set("X", 3);
    });

    test("computed attribute only fires one change event when multiple dependencies change", 1, function()
    {
        var test = new TestModel();
        test.on("change:Z", function() { equal(test.get("Z"), 9); });
        test.set({ "X": 4, "Y": 5 });
    });

    test("computed attribute does not fire change event when dependency is set to an unchanged value", 0, function()
    {
        var test = new TestModel();
        test.on("change:Z", function() { ok(true); });
        test.set("X", 1);
    });

    test("computed attribute does not fire change event when dependencies are changed but computed value remains the same", 1, function()
    {
        var counter = 0;
        var test = new TestModel();
        test.get("Z"); // Caches it once. I don't know if this should happen first automatically.
        test.on("change:Z", function() { counter++; });
        test.set({ X: 2, Y: 1 });
        equal(counter, 0);
    });
    
    test("computed attribute does not fire multiple change events when dependencies are changed within an atomic block", 1, function() {
        var counter = 0;
        var test = new TestModel();
        test.on("change:Z", function() { counter++; });
        Backbone.atomic(function() {
            test.set("X", 4);
            test.set("Y", 5);
        });
        equal(counter, 1);
    });

    // Tests that bind to different models.

    var ModelWithDependencies = Backbone.Model.extend({

        initialize: function()
        {
            this.child1 = new Backbone.Model();
            this.child1.set("A", 2);

            this.child2 = new Backbone.Model();
            this.child2.set("B", 1);

            this.createComputedAttribute({
                attr: "C",
                get: function()
                {
                    return this.child1.get("A") + this.child2.get("B");
                },
                bindings: [{ model: this.child1, attribute: "A" }, { model: this.child2, attribute: "B"}]
            });
        }
    });
    _.extend(ModelWithDependencies.prototype, Backbone.ComputedAttributeMixin);

    test("initialize and get computed attribute that uses a different model as a dependency", 1, function()
    {
        var test = new ModelWithDependencies();
        equal(test.get("C"), 3);
    });

    test("bind to computed attribute and set attribute on depended-on model", 1, function()
    {
        var test = new ModelWithDependencies();
        test.on("change:C", function() { equal(test.get("C"), 5); });
        test.child1.set("A", 4);
    });
    
    test("listening to change when the value of a computed attribute changes passes the model correctly to listeners", 1, function()
    {
        var test = new ModelWithDependencies();
        test.on('change', function(model) { equal(model, test); });
        test.child1.set("A", 4);
    });

    test("bind to non-specific change and set attribute on depended-on model", 1, function()
    {
        var test = new ModelWithDependencies();
        test.on("change", function() { equal(test.get("C"), 5); });
        test.child1.set("A", 4);
    });

    // A different variation on bindings.

    var ModelWithDifferentBindings = Backbone.Model.extend({

        initialize: function()
        {
            this.child1 = new Backbone.Model();
            this.child1.set({ A: "A", B: "B" });

            this.createComputedAttribute({
                attr: "C",
                get: function()
                {
                    return this.child1.get("A") + this.child1.get("B");
                },
                bindings: [{ model: this.child1, attributes: ["A", "B"]}]
            });
        }
    });
    _.extend(ModelWithDifferentBindings.prototype, Backbone.ComputedAttributeMixin);

    test("initialize and get computed attribute with an attribute array binding", 1, function()
    {
        var test = new ModelWithDifferentBindings();
        equal(test.get("C"), "AB");
    });

    test("change first attribute within an attribute array binding", 1, function()
    {
        var test = new ModelWithDifferentBindings();
        test.on("change:C", function() { equal(test.get("C"), "dB"); });
        test.child1.set("A", "d");
    });

    test("change second attribute within an attribute array binding", 1, function()
    {
        var test = new ModelWithDifferentBindings();
        test.on("change:C", function() { equal(test.get("C"), "Ad"); });
        test.child1.set("B", "d");
    });

    // This might not be considered "expected" behavior.
    test("non-specific change will fire even if there is no change if computed attribute has not yet been cached", 1, function()
    {
        var test = new ModelWithDifferentBindings();
        test.on("change", function() { ok(true); });
        test.child1.set({ "A": "AB", "B": "" });
    });

    test("no non-specific change will fire if cached computed attribute is unchanged", 0, function()
    {
        var test = new ModelWithDifferentBindings();
        // Have to call the getter once, just to cache it.
        test.get("C"); 
        test.on("change", function() { ok(false); });
        test.child1.set({ "A": "AB", "B": "" });
    });

    test("events will not be triggered on a destroyed model", 0, function()
    {
        var test = new ModelWithDifferentBindings();
        var c1 = test.child1;
        test.on("change:C", function() { ok(false); });
        test.destroy();
        c1.set("B", "d");
    });

    test("lots of sets, only one change", 1, function()
    {
        var test = new ModelWithDifferentBindings();
        test.on("change:C", function() { equal(test.get("C"), "de"); });
        test.child1.set({ "A": "d", "B": "e" });
        test.child1.set("B", "e");
    });

    // Tests multi level dependencies. The order of these computed properties is important, because
    // it puts some stress on how the attributes are cached.

    var MultiLevelDependencyModel = Backbone.Model.extend({

        initialize: function()
        {
            this.child1 = new TestModel();

            this.createComputedAttribute({
                attr: "C",
                get: function()
                {
                    return this.child1.get("Z") + "c";
                },
                bindings: [{ model: this.child1, attribute: "Z"}]
            });
            
            this.createComputedAttribute({
                attr: "E",
                get: function()
                {
                    return this.child1.get("X") + "e";
                },
                bindings: [{ model: this.child1, attribute: "X"}]
            });
            
            this.createComputedAttribute({
                attr: "D",
                get: function()
                {
                    return this.child1.get("Y") + this.get("E") + "d";
                },
                bindings: [{ model: this.child1, attribute: "Y"}, "E"]
            });
            
            this.createComputedAttribute({
                attr: "F",
                get: function()
                {
                    return this.child1.get("Z") + this.get("D") + "f";
                },
                bindings: [{ model: this.child1, attribute: "Z"}, "D"]
            });
        }
    });
    _.extend(MultiLevelDependencyModel.prototype, Backbone.ComputedAttributeMixin);

    test("get computed attribute with a multi-level dependency", 1, function()
    {
        var test = new MultiLevelDependencyModel();
        equal(test.get("C"), "3c");
    });

    test("change the root attribute of a multi-level dependency", 1, function()
    {
        var test = new MultiLevelDependencyModel();
        test.on("change:C", function() { equal(test.get("C"), "4c"); });
        test.child1.set("X", 2);
    });
    
    test("change event is fired on middle tier of multi-level dependency", 1, function()
    {
        var test = new MultiLevelDependencyModel();
        test.on("change:D", function() { equal(test.get("D"), "yxed"); });
        test.child1.set({ Y : "y", X : "x" });
    });

    // Additional tests for caching computed attributes.

    var NoCacheModel = Backbone.Model.extend({

        initialize: function()
        {
            this.child1 = new Backbone.Model({ Z : 1, Y : 2 });

            this.createComputedAttribute({
                attr: "cached",
                get: function()
                {
                    return { z: this.child1.get("Z"), y : this.child1.get("Y") };
                },
                bindings: [{ model: this.child1, attributes: ["Y", "Z"]}]
            });
            
            this.createComputedAttribute({
                attr: "uncached",
                get: function()
                {
                    return { z: this.child1.get("Z"), y : this.child1.get("Y") };
                },
                bindings: [{ model: this.child1, attributes: ["Y", "Z"]}],
                nocache: true
            });
        }
    });
    _.extend(NoCacheModel.prototype, Backbone.ComputedAttributeMixin);
    
    test("if a cached object is modified, the modified object will be returned by the getter", 1, function()
    {
        var test = new NoCacheModel();
        var obj = test.get("cached");
        obj.z = 3;
        var obj2 = test.get("cached");
        equal(obj2.z, 3);
    });
    
    test("if an uncached object is modified, a new object will be returned by the getter", 1, function()
    {
        var test = new NoCacheModel();
        var obj = test.get("uncached");
        obj.z = 3;
        var obj2 = test.get("uncached");
        equal(obj2.z, 1);
    });
    
    // Tests for different interplays between setting values in event handlers while also using computed attributes.
    
    var MixedAttributeAndEventModel = Backbone.Model.extend({

        initialize: function()
        {
            this.child1 = new Backbone.Model({ X : "x", Y : "y", Z : "z" });

            this.createComputedAttribute({
                attr: "A",
                get: function()
                {
                    return this.child1.get("X") + this.child1.get("Y");
                },
                bindings: [{ model: this.child1, attributes: ["X", "Y"]}]
            });
            
            this.createComputedAttribute({
                attr: "V",
                get: function()
                {
                    return this.child1.get("Z");
                },
                bindings: [{ model: this.child1, attributes: ["Z"]}]
            });

            this.on("change:A", function() 
            {
                this.child1.set("Z", "w");
            }, this);
        }
    });
    _.extend(MixedAttributeAndEventModel.prototype, Backbone.ComputedAttributeMixin);
    
    test("setting a different depended-on attribute when a computed attribute changes can recompute other attributes", 1, function()
    {
        var test = new MixedAttributeAndEventModel();
        test.on("change:V", function() { equal(test.get("V"), "w"); });
        test.child1.set("X", "v");
    });
    
    // Wacky test to handle how caching attributes is affected when multiple models are being updated.

    test("all computed properties change events despite weird dependency order", 2, function()
    {
        var m1 = new Backbone.Model({ A : "a", B : "b" });
        
        var M2 = Backbone.Model.extend({
            initialize: function()
            {
                this.createComputedAttribute({
                    attr: "C",
                    get: function()
                    {
                        return m1.get("A") + "c";
                    },
                    bindings: [{ model: m1, attribute: "A" }]
                });
            }
        });
        _.extend(M2.prototype, Backbone.ComputedAttributeMixin);
        var m2 = new M2();
        
        var M3 = Backbone.Model.extend({
            initialize: function()
            {
                this.createComputedAttribute({
                    attr: "D",
                    get: function()
                    {
                        return m1.get("B") + m2.get("C") + "d";
                    },
                    bindings: [{ model: m1, attribute: "B" }, { model : m2, attribute: "C" }]
                });
            }
        });
        _.extend(M3.prototype, Backbone.ComputedAttributeMixin);
        var m3 = new M3();

        m2.on("change:C", function() { equal(m2.get("C"), "xc"); });
        m3.on("change:D", function() { equal(m3.get("D"), "yxcd"); });
        // The order of these matter, because by updating A first, we cause m2 to get added to the _changeQueue first,
        // which means m3 gets popped off first and D is evaluated, which results in C being re-evaluated, and the
        // tricky part is making sure that when we then pop off m2 that C is still marked as unchanged.
        m1.set({ A : "x", B : "y" }); 
    });
    
    test("specifying attributes via computed hash", 1, function()
    {
        var Model = Backbone.Model.extend({
            computed : {
                "C" : {
                    get: function()
                    {
                        return "hello";
                    },
                    bindings: function()
                    {
                        return [];
                    }
                }
            },
            initialize: function()
            {
                this.createComputedAttributes();
            }
        });
        _.extend(Model.prototype, Backbone.ComputedAttributeMixin);
        var m = new Model();
        equal(m.get("C"), "hello");
    });
    
    test("overriding attributes in computed hash", 1, function()
    {
        var Parent = Backbone.Model.extend({
            computed : {
                "C" : {
                    get: function()
                    {
                        return "hello";
                    },
                    bindings: function()
                    {
                        return [];
                    }
                }
            },
            initialize: function()
            {
                this.createComputedAttributes();
            }
        });
        _.extend(Parent.prototype, Backbone.ComputedAttributeMixin);
        
        var Child = Parent.extend({
            computed : {
                "C" : {
                    get: function()
                    {
                        return "bye";
                    },
                    bindings: function()
                    {
                        return [];
                    }
                }
            }
        });

        var c = new Child();
        equal(c.get("C"), "bye");
    });

});