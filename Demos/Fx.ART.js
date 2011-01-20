/*
---
name: Fx.ART
description: Fx for ART
authors: ["[Arian Stolwijk](http://twitter.com/astolwijk)"]
requires: [Core/Fx, ART/ART]
provides: [Fx.ART]
...
*/

Fx.ART = new Class({

	Extends: Fx,

	initialize: function(element, options){
		this.element = element;
		this.parent(options);
	},

	set: function(now){
		for (var p in now) for (var i = 0, l = now[p].length; i < l; i++){
			this.element[p].apply(this.element, now[p]);
		}
		return this;
	},

	compute: function(from, to, delta){
		var now = {}, l;
		for (var p in from){
			now[p] = [];
			l = from[p].length;
			while (l--) now[p][l] = this.parent(from[p][l], to[p][l], delta);
		}
		return now;
	},

	start: function(properties){
		var from = {}, to = {};
		for (var p in properties){
			from[p] = Array.from(properties[p][0]);
			to[p] = Array.from(properties[p][1]);
		}
		return this.parent(from, to);
	}

});

