var _ = require("underscore");
var assert = require("assert");
var Backbone = require("backbone");
var ComputedAttributeMixin = require("../backbone.computed.js");

suite("Backbone computed attributes", function() {
  suite("Basic Tests", function() {
    var TestModel;
    setup(function() {
      TestModel = Backbone.Model.extend({
        initialize: function() {
          this.createComputedAttribute({
            attr: "Z",
            get: function() {
              return this.get("X") + this.get("Y");
            },
            bindings: [
              { model: this, attribute: "X" },
              { model: this, attribute: "Y" }
            ]
          });
        },
        defaults: {
          "X": 1,
          "Y": 2
        }
      });
      _.extend(TestModel.prototype, ComputedAttributeMixin);
    });

    test("initialize and get computed attribute", function() {
      var test = new TestModel();
      assert.equal(test.get("Z"), 3);
    });

    test("set dependency and get computed attribute", function() {
      var test = new TestModel();
      test.set("X", 2);
      assert.equal(test.get("Z"), 4);
    });

    test("bind to computed attribute and set dependency", function() {
      var test = new TestModel();
      test.on("change:Z", function() { assert.equal(test.get("Z"), 5); });
      test.set("X", 3);
    });

    test("computed attribute only fires one change event when multiple dependencies change", function() {
      var test = new TestModel();
      test.on("change:Z", function() { assert.equal(test.get("Z"), 9); });
      test.set({ "X": 4, "Y": 5 });
    });

    test("computed attribute does not fire change event when dependency is set to an unchanged value", function() {
      var test = new TestModel();
      test.on("change:Z", function() { assert.ok(true); });
      test.set("X", 1);
    });

    test("computed attribute does not fire change event when dependencies are changed but computed value remains the same", function() {
      var counter = 0;
      var test = new TestModel();
      test.get("Z"); // Caches it once. I don't know if this should happen first automatically.
      test.on("change:Z", function() { counter++; });
      test.set({ X: 2, Y: 1 });
      assert.equal(counter, 0);
    });
    
    test("computed attribute does not fire multiple change events when dependencies are changed within an atomic block", function() {
        var counter = 0;
        var test = new TestModel();
        test.on("change:Z", function() { counter++; });
        Backbone.atomic(function() {
            test.set("X", 4);
            test.set("Y", 5);
        });
        assert.equal(counter, 1);
    });
  });

  suite("Binding to collections", function() {
    var TestModel;
    setup(function() {
      TestModel = Backbone.Model.extend({
        initialize: function() {
          this.createComputedAttribute({
            attr: "NumChildrenWithHeightOf5",
            get: function() {
              return this.get("items").where({"height": 5}).length;
            },
            bindings: [
              { collection: this.get("items"), attribute: "height" }
            ]
          });
        }
      });
      _.extend(TestModel.prototype, ComputedAttributeMixin);
    });

    test("initialize and get computed attribute", function() {
      var test = new TestModel({items: new Backbone.Collection()});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 0);
    });

    test("computed attribute works when bound to a collection", function() {
      var test = new TestModel({items: new Backbone.Collection(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 2 })
        ])});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
    });

    test("bind to computed attribute on a collection works when item is added", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection()});
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").add(new Backbone.Model({ height: 5 }));
      assert.equal(counter, 1);
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
    });

    test("computed attribute does not fire multiple change events when dependencies are changed within an atomic block", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection()});
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      Backbone.atomic(function() {
          test.get("items").add(new Backbone.Model({ height: 5 }));
          test.get("items").add(new Backbone.Model({ height: 23 }));
          test.get("items").add(new Backbone.Model({ height: 5 }));
          test.get("items").add(new Backbone.Model({ height: 12 }));
      });
      assert.equal(test.get("NumChildrenWithHeightOf5"), 2);
      assert.equal(counter, 1);
    });

    test("computed attribute does not fire change event when dependency is set to an unchanged value", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection()});
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").add(new Backbone.Model({ height: 5 }));
      assert.equal(counter, 1);
      test.get("items").first().set("height", 5);
      assert.equal(counter, 1);
    });

    test("computed attribute does not fire change event when dependencies are changed but computed value remains the same", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection()});
      test.get("items").add(new Backbone.Model({ height: 5 }));
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").add(new Backbone.Model({ height: 7 }));
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      assert.equal(counter, 0);
    });

    test("when resetting an collection that is a dependency make sure a change event is fired if the computed value changed", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 1 })
        ])});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").reset(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 23 }), 
          new Backbone.Model({ height: 5 })
        ]);
      assert.equal(test.get("NumChildrenWithHeightOf5"), 3);
      assert.equal(counter, 1);
    });

    test("when resetting an collection that is a dependency make sure a change event is not fired if the computed value has not changed", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 2 })
        ])});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").reset(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 2 }), 
          new Backbone.Model({ height: 3 }), 
          new Backbone.Model({ height: 6 })
        ]);
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      assert.equal(counter, 0);
    });

    test("when removing an element from a collection that is a dependency  make sure a change event is fired if the computed value changed", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection(
        [
          new Backbone.Model({ height: 5 }), 
          new Backbone.Model({ height: 5 })
        ])});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 2);
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").remove(test.get("items").first());
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      assert.equal(counter, 1);
    });

    test("when removing an element from a collection that is a dependency make sure a change event is not fired if the computed value has not changed", function() {
      var counter = 0;
      var test = new TestModel({items: new Backbone.Collection(
        [
          new Backbone.Model({ height: 1 }), 
          new Backbone.Model({ height: 5 })
        ])});
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      test.on("change:NumChildrenWithHeightOf5", function() { counter++; });
      test.get("items").remove(test.get("items").first());
      assert.equal(test.get("NumChildrenWithHeightOf5"), 1);
      assert.equal(counter, 0);
    });
  });

  suite("Tests that bind to different models", function() {
    var ModelWithDependencies;
    setup(function() {
      ModelWithDependencies = Backbone.Model.extend({
        initialize: function() {
          this.child1 = new Backbone.Model();
          this.child1.set("A", 2);

          this.child2 = new Backbone.Model();
          this.child2.set("B", 1);

          this.createComputedAttribute({
            attr:"C",
            get: function() {
              return this.child1.get("A") + this.child2.get("B");
            },
            bindings: [
              { model: this.child1, attribute: "A" },
              { model: this.child2, attribute: "B" }
            ]
          });
        }
      });
      _.extend(ModelWithDependencies.prototype, ComputedAttributeMixin);
    });

    test("initialize and get computed attribute that uses a different model as a dependency", function() {
        var test = new ModelWithDependencies();
        assert.equal(test.get("C"), 3);
    });

    test("bind to computed attribute and set attribute on depended-on model", function() {
      var test = new ModelWithDependencies();
      test.on("change:C", function() { assert.equal(test.get("C"), 5); });
      test.child1.set("A", 4);
    });
    
    test("listening to change when the value of a computed attribute changes passes the model correctly to listeners", function() {
        var test = new ModelWithDependencies();
        test.on('change', function(model) { assert.equal(model, test); });
        test.child1.set("A", 4);
    });

    test("bind to non-specific change and set attribute on depended-on model", function() {
      var test = new ModelWithDependencies();
      test.on("change", function() { assert.equal(test.get("C"), 5); });
      test.child1.set("A", 4);
    });
  });

  suite("A different variation on bindings", function() {
    var ModelWithDifferentBindings;
    setup(function() {
      ModelWithDifferentBindings = Backbone.Model.extend({
        initialize: function() {
          this.child1 = new Backbone.Model();
          this.child1.set({ A: "A", B: "B" });
          this.createComputedAttribute({
            attr: "C",
            get: function() {
              return this.child1.get("A") + this.child1.get("B");
            },
            bindings: [{ model: this.child1, attributes: ["A", "B"] }]
          });
        }
      });
    _.extend(ModelWithDifferentBindings.prototype, ComputedAttributeMixin);
    });

    test("initialize and get computed attribute with an attribute array binding", function() {
      var test = new ModelWithDifferentBindings();
      assert.equal(test.get("C"), "AB");
    });

    test("change first attribute within an attribute array binding", function() {
      var test = new ModelWithDifferentBindings();
      test.on("change:C", function() { assert.equal(test.get("C"), "dB"); });
      test.child1.set("A", "d");
    });

    test("change second attribute within an attribute array binding", function() {
      var test = new ModelWithDifferentBindings();
      test.on("change:C", function() { assert.equal(test.get("C"), "Ad"); });
      test.child1.set("B", "d");
    });

    // This might not be considered "expected" behavior.
    test("non-specific change will fire even if there is no change if computed attribute has not yet been cached", function() {
      var test = new ModelWithDifferentBindings();
      test.on("change", function() { assert.ok(true); });
      test.child1.set({ "A": "AB", "B": "" });
    });

    test("no non-specific change will fire if cached computed attribute is unchanged", function() {
      var test = new ModelWithDifferentBindings();
      // Have to call the getter once, just to cache it.
      test.get("C"); 
      test.on("change", function() { assert.ok(false); });
      test.child1.set({ "A": "AB", "B": "" });
    });

    test("events will not be triggered on a destroyed model", function() {
      var test = new ModelWithDifferentBindings();
      var c1 = test.child1;
      test.on("change:C", function() { assert.ok(false); });
      test.destroy();
      c1.set("B", "d");
    });

    test("lots of sets, only one change", function() {
      var test = new ModelWithDifferentBindings();
      test.on("change:C", function() { assert.equal(test.get("C"), "de"); });
      test.child1.set({ "A": "d", "B": "e" });
      test.child1.set("B", "e");
    });
  });

  suite("Tests multi level dependencies. The order of these computed properties is important, because it puts some stress on how the attributes are cached.", function() {
    var TestMode;
    var MultiLevelDependencyModel;
    setup(function() {
      TestModel = Backbone.Model.extend({
        initialize: function() {
          this.createComputedAttribute({
            attr: "Z",
            get: function() {
              return this.get("X") + this.get("Y");
            },
            bindings: [
              { model: this, attribute: "X" },
              { model: this, attribute: "Y" }
            ]
          });
        },
        defaults: {
          "X": 1,
          "Y": 2
        }
      });
      _.extend(TestModel.prototype, ComputedAttributeMixin);

      MultiLevelDependencyModel = Backbone.Model.extend({
        initialize: function() {
          this.child1 = new TestModel();
          this.createComputedAttribute({
            attr: "C",
            get: function() {
              return this.child1.get("Z") + "c";
            },
            bindings: [{ model: this.child1, attribute: "Z"}]
          });
          this.createComputedAttribute({
            attr: "E",
            get: function() {
              return this.child1.get("X") + "e";
            },
            bindings: [{ model: this.child1, attribute: "X"}]
          });
          this.createComputedAttribute({
            attr: "D",
            get: function() {
              return this.child1.get("Y") + this.get("E") + "d";
            },
            bindings: [{ model: this.child1, attribute: "Y"}, "E"]
          });
          this.createComputedAttribute({
            attr: "F",
            get: function() {
              return this.child1.get("Z") + this.get("D") + "f";
            },
            bindings: [{ model: this.child1, attribute: "Z"}, "D"]
          });
        }
      });
      _.extend(MultiLevelDependencyModel.prototype, ComputedAttributeMixin);      
    });


    test("get computed attribute with a multi-level dependency", function() {
      var test = new MultiLevelDependencyModel();
      assert.equal(test.get("C"), "3c");
    });

    test("change the root attribute of a multi-level dependency", function() {
      var test = new MultiLevelDependencyModel();
      test.on("change:C", function() { assert.equal(test.get("C"), "4c"); });
      test.child1.set("X", 2);
    });
    
    test("change event is fired on middle tier of multi-level dependency", function() {
      var test = new MultiLevelDependencyModel();
      test.on("change:D", function() { assert.equal(test.get("D"), "yxed"); });
      test.child1.set({ Y : "y", X : "x" });
    });
  });

  suite("Additional tests for caching computed attributes", function() {
    var NoCacheModel; 
    setup(function() {
      NoCacheModel = Backbone.Model.extend({
        initialize: function() {
          this.child1 = new Backbone.Model({ Z : 1, Y : 2 });
          this.createComputedAttribute({
            attr: "cached",
            get: function() {
              return { z: this.child1.get("Z"), y : this.child1.get("Y") };
            },
            bindings: [{ model: this.child1, attributes: ["Y", "Z"]}]
          });
          this.createComputedAttribute({
            attr: "uncached",
            get: function() {
              return { z: this.child1.get("Z"), y : this.child1.get("Y") };
            },
            bindings: [{ model: this.child1, attributes: ["Y", "Z"]}],
            nocache: true
          });
        }
      });
      _.extend(NoCacheModel.prototype, ComputedAttributeMixin);
    });

    test("if a cached object is modified, the modified object will be returned by the getter", function() {
      var test = new NoCacheModel();
      var obj = test.get("cached");
      obj.z = 3;
      var obj2 = test.get("cached");
      assert.equal(obj2.z, 3);
    });
    
    test("if an uncached object is modified, a new object will be returned by the getter", function() {
      var test = new NoCacheModel();
      var obj = test.get("uncached");
      obj.z = 3;
      var obj2 = test.get("uncached");
      assert.equal(obj2.z, 1);
    });
  });

  suite("Tests for different interplays between setting values in event handles while also using computed attributes", function() {
    var MixedAttributeAndEventModel;
    setup(function() {
      MixedAttributeAndEventModel = Backbone.Model.extend({
          initialize: function() {
            this.child1 = new Backbone.Model({ X : "x", Y : "y", Z : "z" });
            this.createComputedAttribute({
              attr: "A",
              get: function() {
                return this.child1.get("X") + this.child1.get("Y");
              },
              bindings: [{ model: this.child1, attributes: ["X", "Y"]}]
            });
            this.createComputedAttribute({
              attr: "V",
              get: function() {
                return this.child1.get("Z");
              },
              bindings: [{ model: this.child1, attributes: ["Z"]}]
            });
            this.on("change:A", function()  {
              this.child1.set("Z", "w");
            }, this);
          }
      });
      _.extend(MixedAttributeAndEventModel.prototype, ComputedAttributeMixin);
    });

    test("setting a different depended-on attribute when a computed attribute changes can recompute other attributes", function() {
      var test = new MixedAttributeAndEventModel();
      test.on("change:V", function() { assert.equal(test.get("V"), "w"); });
      test.child1.set("X", "v");
    });
  });

  suite("Misc", function() {
    test("all computed properties change events despite weird dependency order", function() {
        var m1 = new Backbone.Model({ A : "a", B : "b" });
        var M2 = Backbone.Model.extend({
          initialize: function() {
            this.createComputedAttribute({
              attr: "C",
              get: function() {
                return m1.get("A") + "c";
              },
              bindings: [{ model: m1, attribute: "A" }]
            });
          }
        });
        _.extend(M2.prototype, ComputedAttributeMixin);

        var m2 = new M2();
        
        var M3 = Backbone.Model.extend({
          initialize: function() {
            this.createComputedAttribute({
              attr: "D",
              get: function() {
                return m1.get("B") + m2.get("C") + "d";
              },
              bindings: [{ model: m1, attribute: "B" }, { model : m2, attribute: "C" }]
            });
          }
        });
        _.extend(M3.prototype, ComputedAttributeMixin);

        var m3 = new M3();

        m2.on("change:C", function() { assert.equal(m2.get("C"), "xc"); });
        m3.on("change:D", function() { assert.equal(m3.get("D"), "yxcd"); });
        // The order of these matter, because by updating A first, we cause m2 to get added to the _changeQueue first,
        // which means m3 gets popped off first and D is evaluated, which results in C being re-evaluated, and the
        // tricky part is making sure that when we then pop off m2 that C is still marked as unchanged.
        m1.set({ A : "x", B : "y" }); 
    });
    
    test("specifying attributes via computed hash", function() {
      var Model = Backbone.Model.extend({
        computed : {
          "C" : {
            get: function() {
              return "hello";
            },
            bindings: function() {
              return [];
            }
          }
        },
        initialize: function() {
          this.createComputedAttributes();
        }
      });
      _.extend(Model.prototype, ComputedAttributeMixin);

      var m = new Model();
      assert.equal(m.get("C"), "hello");
    });
    
    test("overriding attributes in computed hash", function() {
      var Parent = Backbone.Model.extend({
        computed : {
          "C" : {
            get: function() {
              return "hello";
            },
            bindings: function() {
              return [];
            }
          }
        },
        initialize: function() {
          this.createComputedAttributes();
        }
      });
      _.extend(Parent.prototype, ComputedAttributeMixin);
      
      var Child = Parent.extend({
        computed : {
          "C" : {
            get: function() {
              return "bye";
            },
            bindings: function() {
              return [];
            }
          }
        }
      });

      var c = new Child();
      assert.equal(c.get("C"), "bye");
    });
  });
});



