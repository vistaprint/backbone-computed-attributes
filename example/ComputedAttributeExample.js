(function($){

    var model = new Rectangle({
        height: 5,
        width: 10
    });

    var rectangleView = new RectangleView({model: model, el: $('body')});
    rectangleView.render();

    console.log(model.get("area")); // Should be 50
    model.set("height", 10); // Area gets recomputed
    console.log(model.get("area")); // Area should now be 100

})(jQuery);
