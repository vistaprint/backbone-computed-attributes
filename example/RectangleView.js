var RectangleView = Backbone.View.extend({
           
    onChangeWidthInput: function(e)
    {
         this.model.set("width", parseInt(e.currentTarget.value));           
    },
    
    onChangeHeightInput: function(e)
    {
        this.model.set("height", parseInt(e.currentTarget.value));
    },
    
    render: function(){
        this.$el.append("<div class='rectangle' />");
        this.$el.append("<div> Enter width: <input class='width-input' /> </div>");
        this.$el.append("<div> Enter height: <input class='height-input' /> </div>");
        this.$el.append("<div class='area-display' />");
        this.$el.append("<div class='perimeter-display' />");
        
        this.model.on("change:area", _.bind(this.updateRectangle, this));            
        this.$el.find(".width-input").change(_.bind(this.onChangeWidthInput, this)).val(this.model.get("width"));
        this.$el.find(".height-input").change(_.bind(this.onChangeHeightInput, this)).val(this.model.get("height"));
    },

    updateRectangle: function() {
        this.$el.find(".rectangle").css({
            width: this.model.get("width") + "px",
            height: this.model.get("height") + "px",
            border: "2px solid black",
            "margin": "20px"
        });
        this.$el.find(".perimeter-display")
        this.$el.find(".area-display").text("Area = " + this.model.get("area"));
        this.$el.find(".perimeter-display").text("Perimeter = " + this.model.get("perimeter"));
    }
});