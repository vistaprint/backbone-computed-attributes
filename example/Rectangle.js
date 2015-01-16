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
_.extend(Rectangle.prototype, Backbone.ComputedAttributeMixin);