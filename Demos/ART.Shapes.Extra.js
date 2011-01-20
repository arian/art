/*
---
name: ART.Shapes.Extra
description: Some Extra Shapes
authors: ["[Arian Stolwijk](http://twitter.com/astolwijk)"]
requires: [ART/ART.Shape, ART/ART.Path]
provides: [ART.Triangle, ART.Circle, ART.Star]
...
*/

ART.Triangle = new Class({

	Extends: ART.Shape,

	initialize: function(base, height){
		var path = new ART.Path,
			baseHalf = base / 2;

		path.move(0, height).line(base, 0).line(-baseHalf, -height).line(-baseHalf, height).close();

		this.parent(path);
	}

});


ART.Circle = new Class({

	Extends: ART.Shape,

	initialize: function(r){
		var path = new ART.Path,
			d = r * 2;

		path.move(0, r).arc(d, 0, r, r).arc(-d, 0, r, r).close();

		return this.parent(path);
	}

});

ART.Star = new Class({

	Extends: ART.Shape,

	initialize: function(ro, ri, points, startAngle){

		if (!ri) ri = 0.45 * ro;
		if (!points) points = 5;

		var pi = Math.PI,
			a = pi * 2 / points,
			sa = (startAngle || 270) * pi / 180,
			path = new ART.Path;

		path.move(ro * Math.cos(sa), ro * Math.sin(sa));

		for (var i = 0; i < points; i++){
			path.lineTo(
				ri * Math.cos(a * (i + 0.5) + sa),
				ri * Math.sin(a * (i + 0.5) + sa)
			).lineTo(
				ro * Math.cos(a * (i + 1) + sa),
				ro * Math.sin(a * (i + 1) + sa)
			);
		}

		path.close();

		this.parent(path);
	}

});
