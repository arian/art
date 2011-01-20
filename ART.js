/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

...
*/

(function(){

this.MooTools = {
	version: '1.3.1dev',
	build: '%build%'
};

// typeOf, instanceOf

var typeOf = this.typeOf = function(item){
	if (item == null) return 'null';
	if (item.$family) return item.$family();

	if (item.nodeName){
		if (item.nodeType == 1) return 'element';
		if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
	} else if (typeof item.length == 'number'){
		if (item.callee) return 'arguments';
		if ('item' in item) return 'collection';
	}

	return typeof item;
};

var instanceOf = this.instanceOf = function(item, object){
	if (item == null) return false;
	var constructor = item.$constructor || item.constructor;
	while (constructor){
		if (constructor === object) return true;
		constructor = constructor.parent;
	}
	return item instanceof object;
};

// Function overloading

var Function = this.Function;

var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

Function.prototype.overloadSetter = function(usePlural){
	var self = this;
	return function(a, b){
		if (a == null) return this;
		if (usePlural || typeof a != 'string'){
			for (var k in a) self.call(this, k, a[k]);
			if (enumerables) for (var i = enumerables.length; i--;){
				k = enumerables[i];
				if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
			}
		} else {
			self.call(this, a, b);
		}
		return this;
	};
};

Function.prototype.overloadGetter = function(usePlural){
	var self = this;
	return function(a){
		var args, result;
		if (usePlural || typeof a != 'string') args = a;
		else if (arguments.length > 1) args = arguments;
		if (args){
			result = {};
			for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
		} else {
			result = self.call(this, a);
		}
		return result;
	};
};

Function.prototype.extend = function(key, value){
	this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
	this.prototype[key] = value;
}.overloadSetter();

// From

var slice = Array.prototype.slice;

Function.from = function(item){
	return (typeOf(item) == 'function') ? item : function(){
		return item;
	};
};

Array.from = function(item){
	if (item == null) return [];
	return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
};

Number.from = function(item){
	var number = parseFloat(item);
	return isFinite(number) ? number : null;
};

String.from = function(item){
	return item + '';
};

// hide, protect

Function.implement({

	hide: function(){
		this.$hidden = true;
		return this;
	},

	protect: function(){
		this.$protected = true;
		return this;
	}

});

// Type

var Type = this.Type = function(name, object){
	if (name){
		var lower = name.toLowerCase();
		var typeCheck = function(item){
			return (typeOf(item) == lower);
		};

		Type['is' + name] = typeCheck;
		if (object != null){
			object.prototype.$family = (function(){
				return lower;
			}).hide();
			//<1.2compat>
			object.type = typeCheck;
			//</1.2compat>
		}
	}

	if (object == null) return null;

	object.extend(this);
	object.$constructor = Type;
	object.prototype.$constructor = object;

	return object;
};

var toString = Object.prototype.toString;

Type.isEnumerable = function(item){
	return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
};

var hooks = {};

var hooksOf = function(object){
	var type = typeOf(object.prototype);
	return hooks[type] || (hooks[type] = []);
};

var implement = function(name, method){
	if (method && method.$hidden) return this;

	var hooks = hooksOf(this);

	for (var i = 0; i < hooks.length; i++){
		var hook = hooks[i];
		if (typeOf(hook) == 'type') implement.call(hook, name, method);
		else hook.call(this, name, method);
	}
	
	var previous = this.prototype[name];
	if (previous == null || !previous.$protected) this.prototype[name] = method;

	if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function(item){
		return method.apply(item, slice.call(arguments, 1));
	});

	return this;
};

var extend = function(name, method){
	if (method && method.$hidden) return this;
	var previous = this[name];
	if (previous == null || !previous.$protected) this[name] = method;
	return this;
};

Type.implement({

	implement: implement.overloadSetter(),

	extend: extend.overloadSetter(),

	alias: function(name, existing){
		implement.call(this, name, this.prototype[existing]);
	}.overloadSetter(),

	mirror: function(hook){
		hooksOf(this).push(hook);
		return this;
	}

});

new Type('Type', Type);

// Default Types

var force = function(name, object, methods){
	var isType = (object != Object),
		prototype = object.prototype;

	if (isType) object = new Type(name, object);

	for (var i = 0, l = methods.length; i < l; i++){
		var key = methods[i],
			generic = object[key],
			proto = prototype[key];

		if (generic) generic.protect();

		if (isType && proto){
			delete prototype[key];
			prototype[key] = proto.protect();
		}
	}

	if (isType) object.implement(prototype);

	return force;
};

force('String', String, [
	'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
	'slice', 'split', 'substr', 'substring', 'toLowerCase', 'toUpperCase'
])('Array', Array, [
	'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
	'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
])('Number', Number, [
	'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
])('Function', Function, [
	'apply', 'call', 'bind'
])('RegExp', RegExp, [
	'exec', 'test'
])('Object', Object, [
	'create', 'defineProperty', 'defineProperties', 'keys',
	'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
	'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
])('Date', Date, ['now']);

Object.extend = extend.overloadSetter();

Date.extend('now', function(){
	return +(new Date);
});

new Type('Boolean', Boolean);

// fixes NaN returning as Number

Number.prototype.$family = function(){
	return isFinite(this) ? 'number' : 'null';
}.hide();

// Number.random

Number.extend('random', function(min, max){
	return Math.floor(Math.random() * (max - min + 1) + min);
});

// forEach, each

Object.extend('forEach', function(object, fn, bind){
	for (var key in object){
		if (object.hasOwnProperty(key)) fn.call(bind, object[key], key, object);
	}
});

Object.each = Object.forEach;

Array.implement({

	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},

	each: function(fn, bind){
		Array.forEach(this, fn, bind);
		return this;
	}

});

// Array & Object cloning, Object merging and appending

var cloneOf = function(item){
	switch (typeOf(item)){
		case 'array': return item.clone();
		case 'object': return Object.clone(item);
		default: return item;
	}
};

Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

var mergeOne = function(source, key, current){
	switch (typeOf(current)){
		case 'object':
			if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
			else source[key] = Object.clone(current);
		break;
		case 'array': source[key] = current.clone(); break;
		default: source[key] = current;
	}
	return source;
};

Object.extend({

	merge: function(source, k, v){
		if (typeOf(k) == 'string') return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	},

	append: function(original){
		for (var i = 1, l = arguments.length; i < l; i++){
			var extended = arguments[i] || {};
			for (var key in extended) original[key] = extended[key];
		}
		return original;
	}

});

// Object-less types

['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function(name){
	new Type(name);
});

// Unique ID

var UID = Date.now();

String.extend('uniqueID', function(){
	return (UID++).toString(36);
});

//<1.2compat>

var Hash = this.Hash = new Type('Hash', function(object){
	if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
	for (var key in object) this[key] = object[key];
	return this;
});

Hash.implement({

	forEach: function(fn, bind){
		Object.forEach(this, fn, bind);
	},

	getClean: function(){
		var clean = {};
		for (var key in this){
			if (this.hasOwnProperty(key)) clean[key] = this[key];
		}
		return clean;
	},

	getLength: function(){
		var length = 0;
		for (var key in this){
			if (this.hasOwnProperty(key)) length++;
		}
		return length;
	}

});

Hash.alias('each', 'forEach');

Object.type = Type.isObject;

var Native = this.Native = function(properties){
	return new Type(properties.name, properties.initialize);
};

Native.type = Type.type;

Native.implement = function(objects, methods){
	for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
	return Native;
};

var arrayType = Array.type;
Array.type = function(item){
	return instanceOf(item, Array) || arrayType(item);
};

this.$A = function(item){
	return Array.from(item).slice();
};

this.$arguments = function(i){
	return function(){
		return arguments[i];
	};
};

this.$chk = function(obj){
	return !!(obj || obj === 0);
};

this.$clear = function(timer){
	clearTimeout(timer);
	clearInterval(timer);
	return null;
};

this.$defined = function(obj){
	return (obj != null);
};

this.$each = function(iterable, fn, bind){
	var type = typeOf(iterable);
	((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
};

this.$empty = function(){};

this.$extend = function(original, extended){
	return Object.append(original, extended);
};

this.$H = function(object){
	return new Hash(object);
};

this.$merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

this.$lambda = Function.from;
this.$mixin = Object.merge;
this.$random = Number.random;
this.$splat = Array.from;
this.$time = Date.now;

this.$type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

this.$unlink = function(object){
	switch (typeOf(object)){
		case 'object': return Object.clone(object);
		case 'array': return Array.clone(object);
		case 'hash': return new Hash(object);
		default: return object;
	}
};

//</1.2compat>

})();


/*
---

name: Array

description: Contains Array Prototypes like each, contains, and erase.

license: MIT-style license.

requires: Type

provides: Array

...
*/

Array.implement({

	invoke: function(methodName){
		var args = Array.slice(arguments, 1);
		return this.map(function(item){
			return item[methodName].apply(item, args);
		});
	},

	every: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
		}
		return results;
	},

	clean: function(){
		return this.filter(function(item){
			return item != null;
		});
	},

	indexOf: function(item, from){
		var len = this.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},

	associate: function(keys){
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function(object){
		var result = {};
		for (var i = 0, l = this.length; i < l; i++){
			for (var key in object){
				if (object[key](this[i])){
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function(item, from){
		return this.indexOf(item, from) != -1;
	},

	append: function(array){
		this.push.apply(this, array);
		return this;
	},

	getLast: function(){
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function(){
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function(item){
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function(array){
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function(item){
		for (var i = this.length; i--;){
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function(){
		this.length = 0;
		return this;
	},

	flatten: function(){
		var array = [];
		for (var i = 0, l = this.length; i < l; i++){
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},

	pick: function(){
		for (var i = 0, l = this.length; i < l; i++){
			if (this[i] != null) return this[i];
		}
		return null;
	},

	hexToRgb: function(array){
		if (this.length != 3) return null;
		var rgb = this.map(function(value){
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function(array){
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++){
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});

//<1.2compat>

Array.alias('extend', 'append');

var $pick = function(){
	return Array.from(arguments).pick();
};

//</1.2compat>


/*
---

name: Function

description: Contains Function Prototypes like create, bind, pass, and delay.

license: MIT-style license.

requires: Type

provides: Function

...
*/

Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

Function.implement({

	attempt: function(args, bind){
		try {
			return this.apply(bind, Array.from(args));
		} catch (e){}
		
		return null;
	},

	bind: function(bind){
		var self = this,
			args = (arguments.length > 1) ? Array.slice(arguments, 1) : null;
		
		return function(){
			if (!args && !arguments.length) return self.call(bind);
			if (args && arguments.length) return self.apply(bind, args.concat(Array.from(arguments)));
			return self.apply(bind, args || arguments);
		};
	},

	pass: function(args, bind){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.pass((args == null ? [] : args), bind), delay);
	},

	periodical: function(periodical, bind, args){
		return setInterval(this.pass((args == null ? [] : args), bind), periodical);
	}

});

//<1.2compat>

delete Function.prototype.bind;

Function.implement({

	create: function(options){
		var self = this;
		options = options || {};
		return function(event){
			var args = options.arguments;
			args = (args != null) ? Array.from(args) : Array.slice(arguments, (options.event) ? 1 : 0);
			if (options.event) args = [event || window.event].extend(args);
			var returns = function(){
				return self.apply(options.bind || null, args);
			};
			if (options.delay) return setTimeout(returns, options.delay);
			if (options.periodical) return setInterval(returns, options.periodical);
			if (options.attempt) return Function.attempt(returns);
			return returns();
		};
	},

	bind: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	bindWithEvent: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(event){
			return self.apply(bind, (args == null) ? arguments : [event].concat(args));
		};
	},

	run: function(args, bind){
		return this.apply(bind, Array.from(args));
	}

});

var $try = Function.attempt;

//</1.2compat>


/*
---

name: Number

description: Contains Number Prototypes like limit, round, times, and ceil.

license: MIT-style license.

requires: Type

provides: Number

...
*/

Number.implement({

	limit: function(min, max){
		return Math.min(max, Math.max(min, this));
	},

	round: function(precision){
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function(fn, bind){
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	}

});

Number.alias('each', 'times');

(function(math){
	var methods = {};
	math.each(function(name){
		if (!Number[name]) methods[name] = function(){
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);


/*
---

name: String

description: Contains String Prototypes like camelCase, capitalize, test, and toInt.

license: MIT-style license.

requires: Type

provides: String

...
*/

String.implement({

	test: function(regex, params){
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function(string, separator){
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : this.indexOf(string) > -1;
	},

	trim: function(){
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function(){
		return this.replace(/\s+/g, ' ').trim();
	},

	camelCase: function(){
		return this.replace(/-\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function(){
		return this.replace(/[A-Z]/g, function(match){
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function(){
		return this.replace(/\b[a-z]/g, function(match){
			return match.toUpperCase();
		});
	},

	escapeRegExp: function(){
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	hexToRgb: function(array){
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function(array){
		var rgb = this.match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function(object, regexp){
		return this.replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != null) ? object[name] : '';
		});
	}

});


/*
---

name: Browser

description: The Browser Object. Contains Browser initialization, Window and Document, and the Browser Hash.

license: MIT-style license.

requires: [Array, Function, Number, String]

provides: [Browser, Window, Document]

...
*/

(function(){

var document = this.document;
var window = document.window = this;

var UID = 1;

this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var ua = navigator.userAgent.toLowerCase(),
	platform = navigator.platform.toLowerCase(),
	UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0],
	mode = UA[1] == 'ie' && document.documentMode;

var Browser = this.Browser = {

	extend: Function.prototype.extend,

	name: (UA[1] == 'version') ? UA[3] : UA[1],

	version: mode || parseFloat((UA[1] == 'opera' && UA[4]) ? UA[4] : UA[2]),

	Platform: {
		name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
	},

	Features: {
		xpath: !!(document.evaluate),
		air: !!(window.runtime),
		query: !!(document.querySelector),
		json: !!(window.JSON)
	},

	Plugins: {}

};

Browser[Browser.name] = true;
Browser[Browser.name + parseInt(Browser.version, 10)] = true;
Browser.Platform[Browser.Platform.name] = true;

// Request

Browser.Request = (function(){

	var XMLHTTP = function(){
		return new XMLHttpRequest();
	};

	var MSXML2 = function(){
		return new ActiveXObject('MSXML2.XMLHTTP');
	};

	var MSXML = function(){
		return new ActiveXObject('Microsoft.XMLHTTP');
	};

	return Function.attempt(function(){
		XMLHTTP();
		return XMLHTTP;
	}, function(){
		MSXML2();
		return MSXML2;
	}, function(){
		MSXML();
		return MSXML;
	});

})();

Browser.Features.xhr = !!(Browser.Request);

// Flash detection

var version = (Function.attempt(function(){
	return navigator.plugins['Shockwave Flash'].description;
}, function(){
	return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
}) || '0 r0').match(/\d+/g);

Browser.Plugins.Flash = {
	version: Number(version[0] || '0.' + version[1]) || 0,
	build: Number(version[2]) || 0
};

// String scripts

Browser.exec = function(text){
	if (!text) return text;
	if (window.execScript){
		window.execScript(text);
	} else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.text = text;
		document.head.appendChild(script);
		document.head.removeChild(script);
	}
	return text;
};

String.implement('stripScripts', function(exec){
	var scripts = '';
	var text = this.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(all, code){
		scripts += code + '\n';
		return '';
	});
	if (exec === true) Browser.exec(scripts);
	else if (typeOf(exec) == 'function') exec(scripts, text);
	return text;
});

// Window, Document

Browser.extend({
	Document: this.Document,
	Window: this.Window,
	Element: this.Element,
	Event: this.Event
});

this.Window = this.$constructor = new Type('Window', function(){});

this.$family = Function.from('window').hide();

Window.mirror(function(name, method){
	window[name] = method;
});

this.Document = document.$constructor = new Type('Document', function(){});

document.$family = Function.from('document').hide();

Document.mirror(function(name, method){
	document[name] = method;
});

document.html = document.documentElement;
document.head = document.getElementsByTagName('head')[0];

if (document.execCommand) try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e){}

if (this.attachEvent && !this.addEventListener){
	var unloadEvent = function(){
		this.detachEvent('onunload', unloadEvent);
		document.head = document.html = document.window = null;
	};
	this.attachEvent('onunload', unloadEvent);
}

// IE fails on collections and <select>.options (refers to <select>)
var arrayFrom = Array.from;
try {
	arrayFrom(document.html.childNodes);
} catch(e){
	Array.from = function(item){
		if (typeof item != 'string' && Type.isEnumerable(item) && typeOf(item) != 'array'){
			var i = item.length, array = new Array(i);
			while (i--) array[i] = item[i];
			return array;
		}
		return arrayFrom(item);
	};

	var prototype = Array.prototype,
		slice = prototype.slice;
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice'].each(function(name){
		var method = prototype[name];
		Array[name] = function(item){
			return method.apply(Array.from(item), slice.call(arguments, 1));
		};
	});
}

//<1.2compat>

if (Browser.Platform.ios) Browser.Platform.ipod = true;

Browser.Engine = {};

var setEngine = function(name, version){
	Browser.Engine.name = name;
	Browser.Engine[name + version] = true;
	Browser.Engine.version = version;
};

if (Browser.ie){
	Browser.Engine.trident = true;

	switch (Browser.version){
		case 6: setEngine('trident', 4); break;
		case 7: setEngine('trident', 5); break;
		case 8: setEngine('trident', 6);
	}
}

if (Browser.firefox){
	Browser.Engine.gecko = true;

	if (Browser.version >= 3) setEngine('gecko', 19);
	else setEngine('gecko', 18);
}

if (Browser.safari || Browser.chrome){
	Browser.Engine.webkit = true;

	switch (Browser.version){
		case 2: setEngine('webkit', 419); break;
		case 3: setEngine('webkit', 420); break;
		case 4: setEngine('webkit', 525);
	}
}

if (Browser.opera){
	Browser.Engine.presto = true;

	if (Browser.version >= 9.6) setEngine('presto', 960);
	else if (Browser.version >= 9.5) setEngine('presto', 950);
	else setEngine('presto', 925);
}

if (Browser.name == 'unknown'){
	switch ((ua.match(/(?:webkit|khtml|gecko)/) || [])[0]){
		case 'webkit':
		case 'khtml':
			Browser.Engine.webkit = true;
		break;
		case 'gecko':
			Browser.Engine.gecko = true;
	}
}

this.$exec = Browser.exec;

//</1.2compat>

})();


/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

(function(){

var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (expression == null) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {Slick: true, expressions: [], raw: expression, reverse: function(){
		return parse(this.raw, true);
	}};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};

		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}

		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,

	separator,
	combinator,
	combinatorChildren,

	tagName,
	id,
	className,

	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,

	pseudoMarker,
	pseudoClass,
	pseudoQuote,
	pseudoClassQuotedValue,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}

	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}

	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});

	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue,
			type: pseudoMarker.length == 1 ? 'class' : 'element'
		});

	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');

		var test, regexp;

		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}

		if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function(){
			return false;
		};

		if (!test) test = function(value){
			return value && regexp.test(value);
		};

		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});

	}

	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---
name: Slick.Finder
description: The new, superfast css selector engine.
provides: Slick.Finder
requires: Slick.Parser
...
*/

(function(){

var local = {};

// Feature / Bug detection

local.isNativeCode = function(fn){
	return (/\{\s*\[native code\]\s*\}/).test('' + fn);
};

local.isXML = function(document){
	return (!!document.xmlVersion) || (!!document.xml) || (Object.prototype.toString.call(document) == '[object XMLDocument]') ||
	(document.nodeType == 9 && document.documentElement.nodeName != 'HTML');
};

local.setDocument = function(document){

	// convert elements / window arguments to document. if document cannot be extrapolated, the function returns.

	if (document.nodeType == 9); // document
	else if (document.ownerDocument) document = document.ownerDocument; // node
	else if (document.navigator) document = document.document; // window
	else return;

	// check if it's the old document

	if (this.document === document) return;
	this.document = document;
	var root = this.root = document.documentElement;

	this.isXMLDocument = this.isXML(document);

	this.brokenStarGEBTN
	= this.starSelectsClosedQSA
	= this.idGetsName
	= this.brokenMixedCaseQSA
	= this.brokenGEBCN
	= this.brokenCheckedQSA
	= this.brokenEmptyAttributeQSA
	= this.isHTMLDocument
	= false;

	var starSelectsClosed, starSelectsComments,
		brokenSecondClassNameGEBCN, cachedGetElementsByClassName;

	var selected, id;
	var testNode = document.createElement('div');
	root.appendChild(testNode);

	// on non-HTML documents innerHTML and getElementsById doesnt work properly
	try {
		id = 'slick_getbyid_test';
		testNode.innerHTML = '<a id="'+id+'"></a>';
		this.isHTMLDocument = !!document.getElementById(id);
	} catch(e){};

	if (this.isHTMLDocument){
		
		testNode.style.display = 'none';
		
		// IE returns comment nodes for getElementsByTagName('*') for some documents
		testNode.appendChild(document.createComment(''));
		starSelectsComments = (testNode.getElementsByTagName('*').length > 0);

		// IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
		try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.getElementsByTagName('*');
			starSelectsClosed = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		this.brokenStarGEBTN = starSelectsComments || starSelectsClosed;

		// IE 8 returns closed nodes (EG:"</foo>") for querySelectorAll('*') for some documents
		if (testNode.querySelectorAll) try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.querySelectorAll('*');
			this.starSelectsClosedQSA = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		// IE returns elements with the name instead of just id for getElementsById for some documents
		try {
			id = 'slick_id_gets_name';
			testNode.innerHTML = '<a name="'+id+'"></a><b id="'+id+'"></b>';
			this.idGetsName = document.getElementById(id) === testNode.firstChild;
		} catch(e){};

		// Safari 3.2 querySelectorAll doesnt work with mixedcase on quirksmode
		try {
			testNode.innerHTML = '<a class="MiXedCaSe"></a>';
			this.brokenMixedCaseQSA = !testNode.querySelectorAll('.MiXedCaSe').length;
		} catch(e){};

		try {
			testNode.innerHTML = '<a class="f"></a><a class="b"></a>';
			testNode.getElementsByClassName('b').length;
			testNode.firstChild.className = 'b';
			cachedGetElementsByClassName = (testNode.getElementsByClassName('b').length != 2);
		} catch(e){};

		// Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
		try {
			testNode.innerHTML = '<a class="a"></a><a class="f b a"></a>';
			brokenSecondClassNameGEBCN = (testNode.getElementsByClassName('a').length != 2);
		} catch(e){};

		this.brokenGEBCN = cachedGetElementsByClassName || brokenSecondClassNameGEBCN;
		
		// Webkit dont return selected options on querySelectorAll
		try {
			testNode.innerHTML = '<select><option selected="selected">a</option></select>';
			this.brokenCheckedQSA = (testNode.querySelectorAll(':checked').length == 0);
		} catch(e){};
		
		// IE returns incorrect results for attr[*^$]="" selectors on querySelectorAll
		try {
			testNode.innerHTML = '<a class=""></a>';
			this.brokenEmptyAttributeQSA = (testNode.querySelectorAll('[class*=""]').length != 0);
		} catch(e){};
		
	}

	root.removeChild(testNode);
	testNode = null;

	// hasAttribute

	this.hasAttribute = (root && this.isNativeCode(root.hasAttribute)) ? function(node, attribute) {
		return node.hasAttribute(attribute);
	} : function(node, attribute) {
		node = node.getAttributeNode(attribute);
		return !!(node && (node.specified || node.nodeValue));
	};

	// contains
	// FIXME: Add specs: local.contains should be different for xml and html documents?
	this.contains = (root && this.isNativeCode(root.contains)) ? function(context, node){
		return context.contains(node);
	} : (root && root.compareDocumentPosition) ? function(context, node){
		return context === node || !!(context.compareDocumentPosition(node) & 16);
	} : function(context, node){
		if (node) do {
			if (node === context) return true;
		} while ((node = node.parentNode));
		return false;
	};

	// document order sorting
	// credits to Sizzle (http://sizzlejs.com/)

	this.documentSorter = (root.compareDocumentPosition) ? function(a, b){
		if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0;
		return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	} : ('sourceIndex' in root) ? function(a, b){
		if (!a.sourceIndex || !b.sourceIndex) return 0;
		return a.sourceIndex - b.sourceIndex;
	} : (document.createRange) ? function(a, b){
		if (!a.ownerDocument || !b.ownerDocument) return 0;
		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	} : null ;

	this.getUID = (this.isHTMLDocument) ? this.getUIDHTML : this.getUIDXML;

};

// Main Method

local.search = function(context, expression, append, first){

	var found = this.found = (first) ? null : (append || []);

	// context checks

	if (!context) return found; // No context
	if (context.navigator) context = context.document; // Convert the node from a window to a document
	else if (!context.nodeType) return found; // Reject misc junk input

	// setup

	var parsed, i;

	var uniques = this.uniques = {};

	if (this.document !== (context.ownerDocument || context)) this.setDocument(context);

	// should sort if there are nodes in append and if you pass multiple expressions.
	// should remove duplicates if append already has items
	var shouldUniques = !!(append && append.length);

	// avoid duplicating items already in the append array
	if (shouldUniques) for (i = found.length; i--;) this.uniques[this.getUID(found[i])] = true;

	// expression checks

	if (typeof expression == 'string'){ // expression is a string

		// Overrides

		for (i = this.overrides.length; i--;){
			var override = this.overrides[i];
			if (override.regexp.test(expression)){
				var result = override.method.call(context, expression, found, first);
				if (result === false) continue;
				if (result === true) return found;
				return result;
			}
		}

		parsed = this.Slick.parse(expression);
		if (!parsed.length) return found;
	} else if (expression == null){ // there is no expression
		return found;
	} else if (expression.Slick){ // expression is a parsed Slick object
		parsed = expression;
	} else if (this.contains(context.documentElement || context, expression)){ // expression is a node
		(found) ? found.push(expression) : found = expression;
		return found;
	} else { // other junk
		return found;
	}

	// cache elements for the nth selectors

	/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

	this.posNTH = {};
	this.posNTHLast = {};
	this.posNTHType = {};
	this.posNTHTypeLast = {};

	/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

	// if append is null and there is only a single selector with one expression use pushArray, else use pushUID
	this.push = (!shouldUniques && (first || (parsed.length == 1 && parsed.expressions[0].length == 1))) ? this.pushArray : this.pushUID;

	if (found == null) found = [];

	// default engine

	var j, m, n;
	var combinator, tag, id, classList, classes, attributes, pseudos;
	var currentItems, currentExpression, currentBit, lastBit, expressions = parsed.expressions;

	search: for (i = 0; (currentExpression = expressions[i]); i++) for (j = 0; (currentBit = currentExpression[j]); j++){

		combinator = 'combinator:' + currentBit.combinator;
		if (!this[combinator]) continue search;

		tag        = (this.isXMLDocument) ? currentBit.tag : currentBit.tag.toUpperCase();
		id         = currentBit.id;
		classList  = currentBit.classList;
		classes    = currentBit.classes;
		attributes = currentBit.attributes;
		pseudos    = currentBit.pseudos;
		lastBit    = (j === (currentExpression.length - 1));

		this.bitUniques = {};

		if (lastBit){
			this.uniques = uniques;
			this.found = found;
		} else {
			this.uniques = {};
			this.found = [];
		}

		if (j === 0){
			this[combinator](context, tag, id, classes, attributes, pseudos, classList);
			if (first && lastBit && found.length) break search;
		} else {
			if (first && lastBit) for (m = 0, n = currentItems.length; m < n; m++){
				this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
				if (found.length) break search;
			} else for (m = 0, n = currentItems.length; m < n; m++) this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
		}

		currentItems = this.found;
	}

	if (shouldUniques || (parsed.expressions.length > 1)) this.sort(found);

	return (first) ? (found[0] || null) : found;
};

// Utils

local.uidx = 1;
local.uidk = 'slick:uniqueid';

local.getUIDXML = function(node){
	var uid = node.getAttribute(this.uidk);
	if (!uid){
		uid = this.uidx++;
		node.setAttribute(this.uidk, uid);
	}
	return uid;
};

local.getUIDHTML = function(node){
	return node.uniqueNumber || (node.uniqueNumber = this.uidx++);
};

// sort based on the setDocument documentSorter method.

local.sort = function(results){
	if (!this.documentSorter) return results;
	results.sort(this.documentSorter);
	return results;
};

/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

local.cacheNTH = {};

local.matchNTH = /^([+-]?\d*)?([a-z]+)?([+-]\d+)?$/;

local.parseNTHArgument = function(argument){
	var parsed = argument.match(this.matchNTH);
	if (!parsed) return false;
	var special = parsed[2] || false;
	var a = parsed[1] || 1;
	if (a == '-') a = -1;
	var b = +parsed[3] || 0;
	parsed =
		(special == 'n')	? {a: a, b: b} :
		(special == 'odd')	? {a: 2, b: 1} :
		(special == 'even')	? {a: 2, b: 0} : {a: 0, b: a};

	return (this.cacheNTH[argument] = parsed);
};

local.createNTHPseudo = function(child, sibling, positions, ofType){
	return function(node, argument){
		var uid = this.getUID(node);
		if (!this[positions][uid]){
			var parent = node.parentNode;
			if (!parent) return false;
			var el = parent[child], count = 1;
			if (ofType){
				var nodeName = node.nodeName;
				do {
					if (el.nodeName != nodeName) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			} else {
				do {
					if (el.nodeType != 1) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			}
		}
		argument = argument || 'n';
		var parsed = this.cacheNTH[argument] || this.parseNTHArgument(argument);
		if (!parsed) return false;
		var a = parsed.a, b = parsed.b, pos = this[positions][uid];
		if (a == 0) return b == pos;
		if (a > 0){
			if (pos < b) return false;
		} else {
			if (b < pos) return false;
		}
		return ((pos - b) % a) == 0;
	};
};

/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

local.pushArray = function(node, tag, id, classes, attributes, pseudos){
	if (this.matchSelector(node, tag, id, classes, attributes, pseudos)) this.found.push(node);
};

local.pushUID = function(node, tag, id, classes, attributes, pseudos){
	var uid = this.getUID(node);
	if (!this.uniques[uid] && this.matchSelector(node, tag, id, classes, attributes, pseudos)){
		this.uniques[uid] = true;
		this.found.push(node);
	}
};

local.matchNode = function(node, selector){
	var parsed = this.Slick.parse(selector);
	if (!parsed) return true;

	// simple (single) selectors
	var expressions = parsed.expressions, reversedExpressions, simpleExpCounter = 0, i;
	for (i = 0; (currentExpression = expressions[i]); i++){
		if (currentExpression.length == 1){
			var exp = currentExpression[0];
			if (this.matchSelector(node, (this.isXMLDocument) ? exp.tag : exp.tag.toUpperCase(), exp.id, exp.classes, exp.attributes, exp.pseudos)) return true;
			simpleExpCounter++;
		}
	}
	
	if (simpleExpCounter == parsed.length) return false;

	var nodes = this.search(this.document, parsed), item;
	for (i = 0; item = nodes[i++];){
		if (item === node) return true;
	}
	return false;
};

local.matchPseudo = function(node, name, argument){
	var pseudoName = 'pseudo:' + name;
	if (this[pseudoName]) return this[pseudoName](node, argument);
	var attribute = this.getAttribute(node, name);
	return (argument) ? argument == attribute : !!attribute;
};

local.matchSelector = function(node, tag, id, classes, attributes, pseudos){
	if (tag){
		var nodeName = (this.isXMLDocument) ? node.nodeName : node.nodeName.toUpperCase();
		if (tag == '*'){
			if (nodeName < '@') return false; // Fix for comment nodes and closed nodes
		} else {
			if (nodeName != tag) return false;
		}
	}

	if (id && node.getAttribute('id') != id) return false;

	var i, part, cls;
	if (classes) for (i = classes.length; i--;){
		cls = node.getAttribute('class') || node.className;
		if (!(cls && classes[i].regexp.test(cls))) return false;
	}
	if (attributes) for (i = attributes.length; i--;){
		part = attributes[i];
		if (part.operator ? !part.test(this.getAttribute(node, part.key)) : !this.hasAttribute(node, part.key)) return false;
	}
	if (pseudos) for (i = pseudos.length; i--;){
		part = pseudos[i];
		if (!this.matchPseudo(node, part.key, part.value)) return false;
	}
	return true;
};

var combinators = {

	' ': function(node, tag, id, classes, attributes, pseudos, classList){ // all child nodes, any level

		var i, item, children;

		if (this.isHTMLDocument){
			getById: if (id){
				item = this.document.getElementById(id);
				if ((!item && node.all) || (this.idGetsName && item && item.getAttributeNode('id').nodeValue != id)){
					// all[id] returns all the elements with that name or id inside node
					// if theres just one it will return the element, else it will be a collection
					children = node.all[id];
					if (!children) return;
					if (!children[0]) children = [children];
					for (i = 0; item = children[i++];) if (item.getAttributeNode('id').nodeValue == id){
						this.push(item, tag, null, classes, attributes, pseudos);
						break;
					} 
					return;
				}
				if (!item){
					// if the context is in the dom we return, else we will try GEBTN, breaking the getById label
					if (this.contains(this.document.documentElement, node)) return;
					else break getById;
				} else if (this.document !== node && !this.contains(node, item)) return;
				this.push(item, tag, null, classes, attributes, pseudos);
				return;
			}
			getByClass: if (classes && node.getElementsByClassName && !this.brokenGEBCN){
				children = node.getElementsByClassName(classList.join(' '));
				if (!(children && children.length)) break getByClass;
				for (i = 0; item = children[i++];) this.push(item, tag, id, null, attributes, pseudos);
				return;
			}
		}
		getByTag: {
			children = node.getElementsByTagName(tag);
			if (!(children && children.length)) break getByTag;
			if (!this.brokenStarGEBTN) tag = null;
			for (i = 0; item = children[i++];) this.push(item, tag, id, classes, attributes, pseudos);
		}
	},

	'>': function(node, tag, id, classes, attributes, pseudos){ // direct children
		if ((node = node.firstChild)) do {
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
		} while ((node = node.nextSibling));
	},

	'+': function(node, tag, id, classes, attributes, pseudos){ // next sibling
		while ((node = node.nextSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'^': function(node, tag, id, classes, attributes, pseudos){ // first child
		node = node.firstChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'~': function(node, tag, id, classes, attributes, pseudos){ // next siblings
		while ((node = node.nextSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	},

	'++': function(node, tag, id, classes, attributes, pseudos){ // next sibling and previous sibling
		this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
	},

	'~~': function(node, tag, id, classes, attributes, pseudos){ // next siblings and previous siblings
		this['combinator:~'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!~'](node, tag, id, classes, attributes, pseudos);
	},

	'!': function(node, tag, id, classes, attributes, pseudos){  // all parent nodes up to document
		while ((node = node.parentNode)) if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!>': function(node, tag, id, classes, attributes, pseudos){ // direct parent (one level)
		node = node.parentNode;
		if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!+': function(node, tag, id, classes, attributes, pseudos){ // previous sibling
		while ((node = node.previousSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'!^': function(node, tag, id, classes, attributes, pseudos){ // last child
		node = node.lastChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'!~': function(node, tag, id, classes, attributes, pseudos){ // previous siblings
		while ((node = node.previousSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	}

};

for (var c in combinators) local['combinator:' + c] = combinators[c];

var pseudos = {

	/*<pseudo-selectors>*/

	'empty': function(node){
		var child = node.firstChild;
		return !(child && child.nodeType == 1) && !(node.innerText || node.textContent || '').length;
	},

	'not': function(node, expression){
		return !this.matchNode(node, expression);
	},

	'contains': function(node, text){
		return (node.innerText || node.textContent || '').indexOf(text) > -1;
	},

	'first-child': function(node){
		while ((node = node.previousSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'last-child': function(node){
		while ((node = node.nextSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'only-child': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)) if (prev.nodeType == 1) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeType == 1) return false;
		return true;
	},

	/*<nth-pseudo-selectors>*/

	'nth-child': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTH'),

	'nth-last-child': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHLast'),

	'nth-of-type': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTHType', true),

	'nth-last-of-type': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHTypeLast', true),

	'index': function(node, index){
		return this['pseudo:nth-child'](node, '' + index + 1);
	},

	'even': function(node){
		return this['pseudo:nth-child'](node, '2n');
	},

	'odd': function(node){
		return this['pseudo:nth-child'](node, '2n+1');
	},

	/*</nth-pseudo-selectors>*/

	/*<of-type-pseudo-selectors>*/

	'first-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.previousSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'last-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.nextSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'only-of-type': function(node){
		var prev = node, nodeName = node.nodeName;
		while ((prev = prev.previousSibling)) if (prev.nodeName == nodeName) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeName == nodeName) return false;
		return true;
	},

	/*</of-type-pseudo-selectors>*/

	// custom pseudos

	'enabled': function(node){
		return !node.disabled;
	},

	'disabled': function(node){
		return node.disabled;
	},

	'checked': function(node){
		return node.checked || node.selected;
	},

	'focus': function(node){
		return this.isHTMLDocument && this.document.activeElement === node && (node.href || node.type || this.hasAttribute(node, 'tabindex'));
	},

	'root': function(node){
		return (node === this.root);
	},
	
	'selected': function(node){
		return node.selected;
	}

	/*</pseudo-selectors>*/
};

for (var p in pseudos) local['pseudo:' + p] = pseudos[p];

// attributes methods

local.attributeGetters = {

	'class': function(){
		return this.getAttribute('class') || this.className;
	},

	'for': function(){
		return ('htmlFor' in this) ? this.htmlFor : this.getAttribute('for');
	},

	'href': function(){
		return ('href' in this) ? this.getAttribute('href', 2) : this.getAttribute('href');
	},

	'style': function(){
		return (this.style) ? this.style.cssText : this.getAttribute('style');
	},
	
	'tabindex': function(){
		var attributeNode = this.getAttributeNode('tabindex');
		return (attributeNode && attributeNode.specified) ? attributeNode.nodeValue : null;
	}

};

local.getAttribute = function(node, name){
	// FIXME: check if getAttribute() will get input elements on a form on this browser
	// getAttribute is faster than getAttributeNode().nodeValue
	var method = this.attributeGetters[name];
	if (method) return method.call(node);
	var attributeNode = node.getAttributeNode(name);
	return (attributeNode) ? attributeNode.nodeValue : null;
};

// overrides

local.overrides = [];

local.override = function(regexp, method){
	this.overrides.push({regexp: regexp, method: method});
};

/*<overrides>*/

/*<query-selector-override>*/

var reEmptyAttribute = /\[.+[*$^]=(?:""|'')?\]/, qsaFailExpCache = {};

local.override(/./, function(expression, found, first){ //querySelectorAll override

	if (!this.querySelectorAll || !local.isHTMLDocument || local.brokenMixedCaseQSA || qsaFailExpCache[expression] ||
	(local.brokenCheckedQSA && expression.indexOf(':checked') > -1) ||
	(local.brokenEmptyAttributeQSA && reEmptyAttribute.test(expression)) || Slick.disableQSA) return false;

	var nodes, isDocument = (this.nodeType == 9), cacheKey = expression;
	if (!isDocument){
		// non-document rooted QSA
		// credits to Andrew Dupont
		var currentId = this.getAttribute('id'), id = 'slick:id';
		this.setAttribute('id', id);
		expression = '#' + id + ' ' + expression;
	}
	
	try {
		if (first) return this.querySelector(expression) || null;
		else nodes = this.querySelectorAll(expression);
	} catch(e) {
		qsaFailExpCache[cacheKey] = 1;
		return false;
	} finally {
		if (!isDocument){
			if (currentId) this.setAttribute('id', currentId);
			else this.removeAttribute('id');
		}
	}

	var i, node, hasOthers = !!(found.length);

	if (local.starSelectsClosedQSA) for (i = 0; node = nodes[i++];){
		if (node.nodeName > '@' && (!hasOthers || !local.uniques[local.getUIDHTML(node)])) found.push(node);
	} else for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
	}

	if (hasOthers) local.sort(found);

	return true;

});

/*</query-selector-override>*/

/*<tag-override>*/

local.override(/^[\w-]+$|^\*$/, function(expression, found, first){ // tag override
	var tag = expression;
	if (tag == '*' && local.brokenStarGEBTN) return false;

	var nodes = this.getElementsByTagName(tag);

	if (first) return nodes[0] || null;
	var i, node, hasOthers = !!(found.length);

	for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUID(node)]) found.push(node);
	}

	if (hasOthers) local.sort(found);

	return true;
});

/*</tag-override>*/

/*<class-override>*/

local.override(/^\.[\w-]+$/, function(expression, found, first){ // class override
	if (!local.isHTMLDocument || (!this.getElementsByClassName && this.querySelectorAll)) return false;

	var nodes, node, i, hasOthers = !!(found && found.length), className = expression.substring(1);
	if (this.getElementsByClassName && !local.brokenGEBCN){
		nodes = this.getElementsByClassName(className);
		if (first) return nodes[0] || null;
		for (i = 0; node = nodes[i++];){
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	} else {
		var matchClass = new RegExp('(^|\\s)'+ Slick.escapeRegExp(className) +'(\\s|$)');
		nodes = this.getElementsByTagName('*');
		for (i = 0; node = nodes[i++];){
			className = node.className;
			if (!className || !matchClass.test(className)) continue;
			if (first) return node;
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	}
	if (hasOthers) local.sort(found);
	return (first) ? null : true;
});

/*</class-override>*/

/*<id-override>*/

local.override(/^#[\w-]+$/, function(expression, found, first){ // ID override
	if (!local.isHTMLDocument || this.nodeType != 9) return false;

	var id = expression.substring(1), el = this.getElementById(id);
	if (!el) return found;
	if (local.idGetsName && el.getAttributeNode('id').nodeValue != id) return false;
	if (first) return el || null;
	var hasOthers = !!(found.length);
	if (!hasOthers || !local.uniques[local.getUIDHTML(el)]) found.push(el);
	if (hasOthers) local.sort(found);
	return true;
});

/*</id-override>*/

/*</overrides>*/

if (typeof document != 'undefined') local.setDocument(document);

// Slick

var Slick = local.Slick = (this.Slick || {});

Slick.version = '1.0.0';

// Slick finder

Slick.search = function(context, expression, append){
	return local.search(context, expression, append);
};

Slick.find = function(context, expression){
	return local.search(context, expression, null, true);
};

// Slick containment checker

Slick.contains = function(container, node){
	local.setDocument(container);
	return local.contains(container, node);
};

// Slick attribute getter

Slick.getAttribute = function(node, name){
	return local.getAttribute(node, name);
};

// Slick matcher

Slick.match = function(node, selector){
	if (!(node && selector)) return false;
	if (!selector || selector === node) return true;
	local.setDocument(node);
	return local.matchNode(node, selector);
};

// Slick attribute accessor

Slick.defineAttributeGetter = function(name, fn){
	local.attributeGetters[name] = fn;
	return this;
};

Slick.lookupAttributeGetter = function(name){
	return local.attributeGetters[name];
};

// Slick pseudo accessor

Slick.definePseudo = function(name, fn){
	local['pseudo:' + name] = function(node, argument){
		return fn.call(node, argument);
	};
	return this;
};

Slick.lookupPseudo = function(name){
	var pseudo = local['pseudo:' + name];
	if (pseudo) return function(argument){
		return pseudo.call(this, argument);
	};
	return null;
};

// Slick overrides accessor

Slick.override = function(regexp, fn){
	local.override(regexp, fn);
	return this;
};

Slick.isXML = local.isXML;

Slick.uidOf = function(node){
	return local.getUIDHTML(node);
};

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---

name: Element

description: One of the most important items in MooTools. Contains the dollar function, the dollars function, and an handful of cross-browser, time-saver methods to let you easily work with HTML Elements.

license: MIT-style license.

requires: [Window, Document, Array, String, Function, Number, Slick.Parser, Slick.Finder]

provides: [Element, Elements, $, $$, Iframe, Selectors]

...
*/

var Element = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);

	if (!props) props = {};

	if (!(/^[\w-]+$/).test(tag)){
		var parsed = Slick.parse(tag).expressions[0][0];
		tag = (parsed.tag == '*') ? 'div' : parsed.tag;
		if (parsed.id && props.id == null) props.id = parsed.id;

		var attributes = parsed.attributes;
		if (attributes) for (var i = 0, l = attributes.length; i < l; i++){
			var attr = attributes[i];
			if (attr.value != null && attr.operator == '=' && props[attr.key] == null)
				props[attr.key] = attr.value;
		}

		if (parsed.classList && props['class'] == null) props['class'] = parsed.classList.join(' ');
	}

	return document.newElement(tag, props);
};

if (Browser.Element) Element.prototype = Browser.Element.prototype;

new Type('Element', Element).mirror(function(name){
	if (Array.prototype[name]) return;

	var obj = {};
	obj[name] = function(){
		var results = [], args = arguments, elements = true;
		for (var i = 0, l = this.length; i < l; i++){
			var element = this[i], result = results[i] = element[name].apply(element, args);
			elements = (elements && typeOf(result) == 'element');
		}
		return (elements) ? new Elements(results) : results;
	};

	Elements.implement(obj);
});

if (!Browser.Element){
	Element.parent = Object;

	Element.Prototype = {'$family': Function.from('element').hide()};

	Element.mirror(function(name, method){
		Element.Prototype[name] = method;
	});
}

Element.Constructors = {};

//<1.2compat>

Element.Constructors = new Hash;

//</1.2compat>

var IFrame = new Type('IFrame', function(){
	var params = Array.link(arguments, {
		properties: Type.isObject,
		iframe: function(obj){
			return (obj != null);
		}
	});

	var props = params.properties || {}, iframe;
	if (params.iframe) iframe = document.id(params.iframe);
	var onload = props.onload || function(){};
	delete props.onload;
	props.id = props.name = [props.id, props.name, iframe ? (iframe.id || iframe.name) : 'IFrame_' + String.uniqueID()].pick();
	iframe = new Element(iframe || 'iframe', props);

	var onLoad = function(){
		onload.call(iframe.contentWindow);
	};

	if (window.frames[props.id]) onLoad();
	else iframe.addListener('load', onLoad);
	return iframe;
});

var Elements = this.Elements = function(nodes){
	if (nodes && nodes.length){
		var uniques = {}, node;
		for (var i = 0; node = nodes[i++];){
			var uid = Slick.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				this.push(node);
			}
		}
	}
};

Elements.prototype = {length: 0};
Elements.parent = Array;

new Type('Elements', Elements).implement({

	filter: function(filter, bind){
		if (!filter) return this;
		return new Elements(Array.filter(this, (typeOf(filter) == 'string') ? function(item){
			return item.match(filter);
		} : filter, bind));
	}.protect(),

	push: function(){
		var length = this.length;
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) this[length++] = item;
		}
		return (this.length = length);
	}.protect(),

	unshift: function(){
		var items = [];
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) items.push(item);
		}
		return Array.prototype.unshift.apply(this, items);
	}.protect(),

	concat: function(){
		var newElements = new Elements(this);
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = arguments[i];
			if (Type.isEnumerable(item)) newElements.append(item);
			else newElements.push(item);
		}
		return newElements;
	}.protect(),

	append: function(collection){
		for (var i = 0, l = collection.length; i < l; i++) this.push(collection[i]);
		return this;
	}.protect(),

	empty: function(){
		while (this.length) delete this[--this.length];
		return this;
	}.protect()

});

//<1.2compat>

Elements.alias('extend', 'append');

//</1.2compat>

(function(){

// FF, IE
var splice = Array.prototype.splice, object = {'0': 0, '1': 1, length: 2};

splice.call(object, 1, 1);
if (object[1] == 1) Elements.implement('splice', function(){
	var length = this.length;
	splice.apply(this, arguments);
	while (length >= this.length) delete this[length--];
	return this;
}.protect());

Elements.implement(Array.prototype);

Array.mirror(Elements);

/*<ltIE8>*/
var createElementAcceptsHTML;
try {
	var x = document.createElement('<input name=x>');
	createElementAcceptsHTML = (x.name == 'x');
} catch(e){}

var escapeQuotes = function(html){
	return ('' + html).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};
/*</ltIE8>*/

Document.implement({

	newElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		/*<ltIE8>*/// Fix for readonly name and type properties in IE < 8
		if (createElementAcceptsHTML && props){
			tag = '<' + tag;
			if (props.name) tag += ' name="' + escapeQuotes(props.name) + '"';
			if (props.type) tag += ' type="' + escapeQuotes(props.type) + '"';
			tag += '>';
			delete props.name;
			delete props.type;
		}
		/*</ltIE8>*/
		return this.id(this.createElement(tag)).set(props);
	}

});

})();

Document.implement({

	newTextNode: function(text){
		return this.createTextNode(text);
	},

	getDocument: function(){
		return this;
	},

	getWindow: function(){
		return this.window;
	},

	id: (function(){

		var types = {

			string: function(id, nocash, doc){
				id = Slick.find(doc, '#' + id.replace(/(\W)/g, '\\$1'));
				return (id) ? types.element(id, nocash) : null;
			},

			element: function(el, nocash){
				$uid(el);
				if (!nocash && !el.$family && !(/^(?:object|embed)$/i).test(el.tagName)){
					Object.append(el, Element.Prototype);
				}
				return el;
			},

			object: function(obj, nocash, doc){
				if (obj.toElement) return types.element(obj.toElement(doc), nocash);
				return null;
			}

		};

		types.textnode = types.whitespace = types.window = types.document = function(zero){
			return zero;
		};

		return function(el, nocash, doc){
			if (el && el.$family && el.uid) return el;
			var type = typeOf(el);
			return (types[type]) ? types[type](el, nocash, doc || document) : null;
		};

	})()

});

if (window.$ == null) Window.implement('$', function(el, nc){
	return document.id(el, nc, this.document);
});

Window.implement({

	getDocument: function(){
		return this.document;
	},

	getWindow: function(){
		return this;
	}

});

[Document, Element].invoke('implement', {

	getElements: function(expression){
		return Slick.search(this, expression, new Elements);
	},

	getElement: function(expression){
		return document.id(Slick.find(this, expression));
	}

});

//<1.2compat>

(function(search, find, match){

	this.Selectors = {};
	var pseudos = this.Selectors.Pseudo = new Hash();

	var addSlickPseudos = function(){
		for (var name in pseudos) if (pseudos.hasOwnProperty(name)){
			Slick.definePseudo(name, pseudos[name]);
			delete pseudos[name];
		}
	};

	Slick.search = function(context, expression, append){
		addSlickPseudos();
		return search.call(this, context, expression, append);
	};

	Slick.find = function(context, expression){
		addSlickPseudos();
		return find.call(this, context, expression);
	};

	Slick.match = function(node, selector){
		addSlickPseudos();
		return match.call(this, node, selector);
	};

})(Slick.search, Slick.find, Slick.match);

if (window.$$ == null) Window.implement('$$', function(selector){
	var elements = new Elements;
	if (arguments.length == 1 && typeof selector == 'string') return Slick.search(this.document, selector, elements);
	var args = Array.flatten(arguments);
	for (var i = 0, l = args.length; i < l; i++){
		var item = args[i];
		switch (typeOf(item)){
			case 'element': elements.push(item); break;
			case 'string': Slick.search(this.document, item, elements);
		}
	}
	return elements;
});

//</1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	if (arguments.length == 1){
		if (typeof selector == 'string') return Slick.search(this.document, selector, new Elements);
		else if (Type.isEnumerable(selector)) return new Elements(selector);
	}
	return new Elements(arguments);
});

(function(){

var collected = {}, storage = {};
var formProps = {input: 'checked', option: 'selected', textarea: 'value'};

var get = function(uid){
	return (storage[uid] || (storage[uid] = {}));
};

var clean = function(item){
	var uid = item.uid;
	if (item.removeEvents) item.removeEvents();
	if (item.clearAttributes) item.clearAttributes();
	if (uid != null){
		delete collected[uid];
		delete storage[uid];
	}
	return item;
};

var camels = ['defaultValue', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan', 'frameBorder', 'maxLength', 'readOnly',
	'rowSpan', 'tabIndex', 'useMap'
];
var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked', 'disabled', 'readOnly', 'multiple', 'selected',
	'noresize', 'defer', 'defaultChecked'
];
 var attributes = {
	'html': 'innerHTML',
	'class': 'className',
	'for': 'htmlFor',
	'text': (function(){
		var temp = document.createElement('div');
		return (temp.textContent == null) ? 'innerText' : 'textContent';
	})()
};
var readOnly = ['type'];
var expandos = ['value', 'defaultValue'];
var uriAttrs = /^(?:href|src|usemap)$/i;

bools = bools.associate(bools);
camels = camels.associate(camels.map(String.toLowerCase));
readOnly = readOnly.associate(readOnly);

Object.append(attributes, expandos.associate(expandos));

var inserters = {

	before: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element);
	},

	after: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element.nextSibling);
	},

	bottom: function(context, element){
		element.appendChild(context);
	},

	top: function(context, element){
		element.insertBefore(context, element.firstChild);
	}

};

inserters.inside = inserters.bottom;

//<1.2compat>

Object.each(inserters, function(inserter, where){

	where = where.capitalize();

	var methods = {};

	methods['inject' + where] = function(el){
		inserter(this, document.id(el, true));
		return this;
	};

	methods['grab' + where] = function(el){
		inserter(document.id(el, true), this);
		return this;
	};

	Element.implement(methods);

});

//</1.2compat>

var injectCombinator = function(expression, combinator){
	if (!expression) return combinator;

	expression = Object.clone(Slick.parse(expression));

	var expressions = expression.expressions;
	for (var i = expressions.length; i--;)
		expressions[i][0].combinator = combinator;

	return expression;
};

Element.implement({

	set: function(prop, value){
		var property = Element.Properties[prop];
		(property && property.set) ? property.set.call(this, value) : this.setProperty(prop, value);
	}.overloadSetter(),

	get: function(prop){
		var property = Element.Properties[prop];
		return (property && property.get) ? property.get.apply(this) : this.getProperty(prop);
	}.overloadGetter(),

	erase: function(prop){
		var property = Element.Properties[prop];
		(property && property.erase) ? property.erase.apply(this) : this.removeProperty(prop);
		return this;
	},

	setProperty: function(attribute, value){
		attribute = camels[attribute] || attribute;
		if (value == null) return this.removeProperty(attribute);
		var key = attributes[attribute];
		(key) ? this[key] = value :
			(bools[attribute]) ? this[attribute] = !!value : this.setAttribute(attribute, '' + value);
		return this;
	},

	setProperties: function(attributes){
		for (var attribute in attributes) this.setProperty(attribute, attributes[attribute]);
		return this;
	},

	getProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute] || readOnly[attribute];
		return (key) ? this[key] :
			(bools[attribute]) ? !!this[attribute] :
			(uriAttrs.test(attribute) ? this.getAttribute(attribute, 2) :
			(key = this.getAttributeNode(attribute)) ? key.nodeValue : null) || null;
	},

	getProperties: function(){
		var args = Array.from(arguments);
		return args.map(this.getProperty, this).associate(args);
	},

	removeProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute];
		(key) ? this[key] = '' :
			(bools[attribute]) ? this[attribute] = false : this.removeAttribute(attribute);
		return this;
	},

	removeProperties: function(){
		Array.each(arguments, this.removeProperty, this);
		return this;
	},

	hasClass: function(className){
		return this.className.clean().contains(className, ' ');
	},

	addClass: function(className){
		if (!this.hasClass(className)) this.className = (this.className + ' ' + className).clean();
		return this;
	},

	removeClass: function(className){
		this.className = this.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		return this;
	},

	toggleClass: function(className, force){
		if (force == null) force = !this.hasClass(className);
		return (force) ? this.addClass(className) : this.removeClass(className);
	},

	adopt: function(){
		var parent = this, fragment, elements = Array.flatten(arguments), length = elements.length;
		if (length > 1) parent = fragment = document.createDocumentFragment();

		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) parent.appendChild(element);
		}

		if (fragment) this.appendChild(fragment);

		return this;
	},

	appendText: function(text, where){
		return this.grab(this.getDocument().newTextNode(text), where);
	},

	grab: function(el, where){
		inserters[where || 'bottom'](document.id(el, true), this);
		return this;
	},

	inject: function(el, where){
		inserters[where || 'bottom'](this, document.id(el, true));
		return this;
	},

	replaces: function(el){
		el = document.id(el, true);
		el.parentNode.replaceChild(this, el);
		return this;
	},

	wraps: function(el, where){
		el = document.id(el, true);
		return this.replaces(el).grab(el, where);
	},

	getPrevious: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!~')));
	},

	getAllPrevious: function(expression){
		return Slick.search(this, injectCombinator(expression, '!~'), new Elements);
	},

	getNext: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '~')));
	},

	getAllNext: function(expression){
		return Slick.search(this, injectCombinator(expression, '~'), new Elements);
	},

	getFirst: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>'))[0]);
	},

	getLast: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>')).getLast());
	},

	getParent: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!')));
	},

	getParents: function(expression){
		return Slick.search(this, injectCombinator(expression, '!'), new Elements);
	},

	getSiblings: function(expression){
		return Slick.search(this, injectCombinator(expression, '~~'), new Elements);
	},

	getChildren: function(expression){
		return Slick.search(this, injectCombinator(expression, '>'), new Elements);
	},

	getWindow: function(){
		return this.ownerDocument.window;
	},

	getDocument: function(){
		return this.ownerDocument;
	},

	getElementById: function(id){
		return document.id(Slick.find(this, '#' + ('' + id).replace(/(\W)/g, '\\$1')));
	},

	getSelected: function(){
		this.selectedIndex; // Safari 3.2.1
		return new Elements(Array.from(this.options).filter(function(option){
			return option.selected;
		}));
	},

	toQueryString: function(){
		var queryString = [];
		this.getElements('input, select, textarea').each(function(el){
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');

			Array.from(value).each(function(val){
				if (typeof val != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(val));
			});
		});
		return queryString.join('&');
	},

	destroy: function(){
		var children = clean(this).getElementsByTagName('*');
		Array.each(children, clean);
		Element.dispose(this);
		return null;
	},

	empty: function(){
		Array.from(this.childNodes).each(Element.dispose);
		return this;
	},

	dispose: function(){
		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
	},

	match: function(expression){
		return !expression || Slick.match(this, expression);
	}

});

var cleanClone = function(node, element, keepid){
	if (!keepid) node.removeAttribute('id');
	if (Browser.ie){
		node.clearAttributes();
		node.mergeAttributes(element);
		node.removeAttribute('uid');
		if (node.options){
			var no = node.options, eo = element.options;
			for (var i = no.length; i--;) no[i].selected = eo[i].selected;
		}
	}
	var prop = formProps[element.tagName.toLowerCase()];
	if (prop && element[prop]) node[prop] = element[prop];
};

Element.implement('clone', function(contents, keepid){
	contents = contents !== false;
	var clone = this.cloneNode(contents);

	if (contents){
		var ce = clone.getElementsByTagName('*'), te = this.getElementsByTagName('*');
		for (var i = ce.length; i--;) cleanClone(ce[i], te[i], keepid);
	}

	cleanClone(clone, this, keepid);

	if (Browser.ie){
		var co = clone.getElementsByTagName('object'), to = this.getElementsByTagName('object');
		for (var i = co.length; i--;) co[i].outerHTML = to[i].outerHTML;
	}
	return document.id(clone);
});

var contains = {contains: function(element){
	return Slick.contains(this, element);
}};

if (!document.contains) Document.implement(contains);
if (!document.createElement('div').contains) Element.implement(contains);

//<1.2compat>

Element.implement('hasChild', function(element){
	return this !== element && this.contains(element);
});

//</1.2compat>

[Element, Window, Document].invoke('implement', {

	addListener: function(type, fn){
		if (type == 'unload'){
			var old = fn, self = this;
			fn = function(){
				self.removeListener('unload', fn);
				old();
			};
		} else {
			collected[$uid(this)] = this;
		}
		if (this.addEventListener) this.addEventListener(type, fn, !!arguments[2]);
		else this.attachEvent('on' + type, fn);
		return this;
	},

	removeListener: function(type, fn){
		if (this.removeEventListener) this.removeEventListener(type, fn, !!arguments[2]);
		else this.detachEvent('on' + type, fn);
		return this;
	},

	retrieve: function(property, dflt){
		var storage = get($uid(this)), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	},

	store: function(property, value){
		var storage = get($uid(this));
		storage[property] = value;
		return this;
	},

	eliminate: function(property){
		var storage = get($uid(this));
		delete storage[property];
		return this;
	}

});

// IE purge
if (window.attachEvent && !window.addEventListener) window.addListener('unload', function(){
	Object.each(collected, clean);
	if (window.CollectGarbage) CollectGarbage();
});

})();

Element.Properties = {};

//<1.2compat>

Element.Properties = new Hash;

//</1.2compat>

Element.Properties.style = {

	set: function(style){
		this.style.cssText = style;
	},

	get: function(){
		return this.style.cssText;
	},

	erase: function(){
		this.style.cssText = '';
	}

};

Element.Properties.tag = {

	get: function(){
		return this.tagName.toLowerCase();
	}

};

(function(maxLength){
	if (maxLength != null) Element.Properties.maxlength = Element.Properties.maxLength = {
		get: function(){
			var maxlength = this.getAttribute('maxLength');
			return maxlength == maxLength ? null : maxlength;
		}
	};
})(document.createElement('input').getAttribute('maxLength'));

Element.Properties.html = (function(){

	var tableTest = Function.attempt(function(){
		var table = document.createElement('table');
		table.innerHTML = '<tr><td></td></tr>';
	});

	var wrapper = document.createElement('div');

	var translations = {
		table: [1, '<table>', '</table>'],
		select: [1, '<select>', '</select>'],
		tbody: [2, '<table><tbody>', '</tbody></table>'],
		tr: [3, '<table><tbody><tr>', '</tr></tbody></table>']
	};
	translations.thead = translations.tfoot = translations.tbody;

	var html = {
		set: function(){
			var html = Array.flatten(arguments).join('');
			var wrap = (!tableTest && translations[this.get('tag')]);
			if (wrap){
				var first = wrapper;
				first.innerHTML = wrap[1] + html + wrap[2];
				for (var i = wrap[0]; i--;) first = first.firstChild;
				this.empty().adopt(first.childNodes);
			} else {
				this.innerHTML = html;
			}
		}
	};

	html.erase = html.set;

	return html;
})();


/*
---

name: Object

description: Object generic methods

license: MIT-style license.

requires: Type

provides: [Object, Hash]

...
*/


Object.extend({

	subset: function(object, keys){
		var results = {};
		for (var i = 0, l = keys.length; i < l; i++){
			var k = keys[i];
			results[k] = object[k];
		}
		return results;
	},

	map: function(object, fn, bind){
		var results = {};
		for (var key in object){
			if (object.hasOwnProperty(key)) results[key] = fn.call(bind, object[key], key, object);
		}
		return results;
	},

	filter: function(object, fn, bind){
		var results = {};
		Object.each(object, function(value, key){
			if (fn.call(bind, value, key, object)) results[key] = value;
		});
		return results;
	},

	every: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && !fn.call(bind, object[key], key)) return false;
		}
		return true;
	},

	some: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && fn.call(bind, object[key], key)) return true;
		}
		return false;
	},

	keys: function(object){
		var keys = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) keys.push(key);
		}
		return keys;
	},

	values: function(object){
		var values = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) values.push(object[key]);
		}
		return values;
	},

	getLength: function(object){
		return Object.keys(object).length;
	},

	keyOf: function(object, value){
		for (var key in object){
			if (object.hasOwnProperty(key) && object[key] === value) return key;
		}
		return null;
	},

	contains: function(object, value){
		return Object.keyOf(object, value) != null;
	},

	toQueryString: function(object, base){
		var queryString = [];

		Object.each(object, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result;
			switch (typeOf(value)){
				case 'object': result = Object.toQueryString(value, key); break;
				case 'array':
					var qs = {};
					value.each(function(val, i){
						qs[i] = val;
					});
					result = Object.toQueryString(qs, key);
				break;
				default: result = key + '=' + encodeURIComponent(value);
			}
			if (value != null) queryString.push(result);
		});

		return queryString.join('&');
	}

});


//<1.2compat>

Hash.implement({

	has: Object.prototype.hasOwnProperty,

	keyOf: function(value){
		return Object.keyOf(this, value);
	},

	hasValue: function(value){
		return Object.contains(this, value);
	},

	extend: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.set(this, key, value);
		}, this);
		return this;
	},

	combine: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.include(this, key, value);
		}, this);
		return this;
	},

	erase: function(key){
		if (this.hasOwnProperty(key)) delete this[key];
		return this;
	},

	get: function(key){
		return (this.hasOwnProperty(key)) ? this[key] : null;
	},

	set: function(key, value){
		if (!this[key] || this.hasOwnProperty(key)) this[key] = value;
		return this;
	},

	empty: function(){
		Hash.each(this, function(value, key){
			delete this[key];
		}, this);
		return this;
	},

	include: function(key, value){
		if (this[key] == null) this[key] = value;
		return this;
	},

	map: function(fn, bind){
		return new Hash(Object.map(this, fn, bind));
	},

	filter: function(fn, bind){
		return new Hash(Object.filter(this, fn, bind));
	},

	every: function(fn, bind){
		return Object.every(this, fn, bind);
	},

	some: function(fn, bind){
		return Object.some(this, fn, bind);
	},

	getKeys: function(){
		return Object.keys(this);
	},

	getValues: function(){
		return Object.values(this);
	},

	toQueryString: function(base){
		return Object.toQueryString(this, base);
	}

});

Hash.extend = Object.append;

Hash.alias({indexOf: 'keyOf', contains: 'hasValue'});

//</1.2compat>


/*
---

name: Event

description: Contains the Event Class, to make the event object cross-browser.

license: MIT-style license.

requires: [Window, Document, Array, Function, String, Object]

provides: Event

...
*/

var Event = new Type('Event', function(event, win){
	if (!win) win = window;
	var doc = win.document;
	event = event || win.event;
	if (event.$extended) return event;
	this.$extended = true;
	var type = event.type,
		target = event.target || event.srcElement,
		page = {},
		client = {};
	while (target && target.nodeType == 3) target = target.parentNode;

	if (type.indexOf('key') != -1){
		var code = event.which || event.keyCode;
		var key = Object.keyOf(Event.Keys, code);
		if (type == 'keydown'){
			var fKey = code - 111;
			if (fKey > 0 && fKey < 13) key = 'f' + fKey;
		}
		if (!key) key = String.fromCharCode(code).toLowerCase();
	} else if ((/click|mouse|menu/i).test(type)){
		doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
		page = {
			x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
			y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		};
		client = {
			x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
			y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		};
		if ((/DOMMouseScroll|mousewheel/).test(type)){
			var wheel = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
		}
		var rightClick = (event.which == 3) || (event.button == 2),
			related = null;
		if ((/over|out/).test(type)){
			related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			var testRelated = function(){
				while (related && related.nodeType == 3) related = related.parentNode;
				return true;
			};
			var hasRelated = (Browser.firefox2) ? testRelated.attempt() : testRelated();
			related = (hasRelated) ? related : null;
		}
	} else if ((/gesture|touch/i).test(type)){
		this.rotation = event.rotation;
		this.scale = event.scale;
		this.targetTouches = event.targetTouches;
		this.changedTouches = event.changedTouches;
		var touches = this.touches = event.touches;
		if (touches && touches[0]){
			var touch = touches[0];
			page = {x: touch.pageX, y: touch.pageY};
			client = {x: touch.clientX, y: touch.clientY};
		}
	}

	return Object.append(this, {
		event: event,
		type: type,

		page: page,
		client: client,
		rightClick: rightClick,

		wheel: wheel,

		relatedTarget: document.id(related),
		target: document.id(target),

		code: code,
		key: key,

		shift: event.shiftKey,
		control: event.ctrlKey,
		alt: event.altKey,
		meta: event.metaKey
	});
});

Event.Keys = {
	'enter': 13,
	'up': 38,
	'down': 40,
	'left': 37,
	'right': 39,
	'esc': 27,
	'space': 32,
	'backspace': 8,
	'tab': 9,
	'delete': 46
};

//<1.2compat>

Event.Keys = new Hash(Event.Keys);

//</1.2compat>

Event.implement({

	stop: function(){
		return this.stopPropagation().preventDefault();
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	}

});


/*
---

name: Element.Event

description: Contains Element methods for dealing with events. This file also includes mouseenter and mouseleave custom Element Events.

license: MIT-style license.

requires: [Element, Event]

provides: Element.Event

...
*/

(function(){

Element.Properties.events = {set: function(events){
	this.addEvents(events);
}};

[Element, Window, Document].invoke('implement', {

	addEvent: function(type, fn){
		var events = this.retrieve('events', {});
		if (!events[type]) events[type] = {keys: [], values: []};
		if (events[type].keys.contains(fn)) return this;
		events[type].keys.push(fn);
		var realType = type,
			custom = Element.Events[type],
			condition = fn,
			self = this;
		if (custom){
			if (custom.onAdd) custom.onAdd.call(this, fn);
			if (custom.condition){
				condition = function(event){
					if (custom.condition.call(this, event)) return fn.call(this, event);
					return true;
				};
			}
			realType = custom.base || realType;
		}
		var defn = function(){
			return fn.call(self);
		};
		var nativeEvent = Element.NativeEvents[realType];
		if (nativeEvent){
			if (nativeEvent == 2){
				defn = function(event){
					event = new Event(event, self.getWindow());
					if (condition.call(self, event) === false) event.stop();
				};
			}
			this.addListener(realType, defn, arguments[2]);
		}
		events[type].values.push(defn);
		return this;
	},

	removeEvent: function(type, fn){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		var list = events[type];
		var index = list.keys.indexOf(fn);
		if (index == -1) return this;
		var value = list.values[index];
		delete list.keys[index];
		delete list.values[index];
		var custom = Element.Events[type];
		if (custom){
			if (custom.onRemove) custom.onRemove.call(this, fn);
			type = custom.base || type;
		}
		return (Element.NativeEvents[type]) ? this.removeListener(type, value, arguments[2]) : this;
	},

	addEvents: function(events){
		for (var event in events) this.addEvent(event, events[event]);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		var attached = this.retrieve('events');
		if (!attached) return this;
		if (!events){
			for (type in attached) this.removeEvents(type);
			this.eliminate('events');
		} else if (attached[events]){
			attached[events].keys.each(function(fn){
				this.removeEvent(events, fn);
			}, this);
			delete attached[events];
		}
		return this;
	},

	fireEvent: function(type, args, delay){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		args = Array.from(args);

		events[type].keys.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	cloneEvents: function(from, type){
		from = document.id(from);
		var events = from.retrieve('events');
		if (!events) return this;
		if (!type){
			for (var eventType in events) this.cloneEvents(from, eventType);
		} else if (events[type]){
			events[type].keys.each(function(fn){
				this.addEvent(type, fn);
			}, this);
		}
		return this;
	}

});

// IE9
try {
	if (typeof HTMLElement != 'undefined')
		HTMLElement.prototype.fireEvent = Element.prototype.fireEvent;
} catch(e){}

Element.NativeEvents = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

var check = function(event){
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
};

Element.Events = {

	mouseenter: {
		base: 'mouseover',
		condition: check
	},

	mouseleave: {
		base: 'mouseout',
		condition: check
	},

	mousewheel: {
		base: (Browser.firefox) ? 'DOMMouseScroll' : 'mousewheel'
	}

};

//<1.2compat>

Element.Events = new Hash(Element.Events);

//</1.2compat>

})();


/*
---

name: DOMReady

description: Contains the custom event domready.

license: MIT-style license.

requires: [Browser, Element, Element.Event]

provides: [DOMReady, DomReady]

...
*/

(function(window, document){

var ready,
	loaded,
	checks = [],
	shouldPoll,
	timer,
	isFramed = true;

// Thanks to Rich Dougherty <http://www.richdougherty.com/>
try {
	isFramed = window.frameElement != null;
} catch(e){}

var domready = function(){
	clearTimeout(timer);
	if (ready) return;
	Browser.loaded = ready = true;
	document.removeListener('DOMContentLoaded', domready).removeListener('readystatechange', check);
	
	document.fireEvent('domready');
	window.fireEvent('domready');
};

var check = function(){
	for (var i = checks.length; i--;) if (checks[i]()){
		domready();
		return true;
	}

	return false;
};

var poll = function(){
	clearTimeout(timer);
	if (!check()) timer = setTimeout(poll, 10);
};

document.addListener('DOMContentLoaded', domready);

// doScroll technique by Diego Perini http://javascript.nwbox.com/IEContentLoaded/
var testElement = document.createElement('div');
if (testElement.doScroll && !isFramed){
	checks.push(function(){
		try {
			testElement.doScroll();
			return true;
		} catch (e){}

		return false;
	});
	shouldPoll = true;
}

if (document.readyState) checks.push(function(){
	var state = document.readyState;
	return (state == 'loaded' || state == 'complete');
});

if ('onreadystatechange' in document) document.addListener('readystatechange', check);
else shouldPoll = true;

if (shouldPoll) poll();

Element.Events.domready = {
	onAdd: function(fn){
		if (ready) fn.call(this);
	}
};

// Make sure that domready fires before load
Element.Events.load = {
	base: 'load',
	onAdd: function(fn){
		if (loaded && this == window) fn.call(this);
	},
	condition: function(){
		if (this == window){
			domready();
			delete Element.Events.load;
		}
		
		return true;
	}
};

// This is based on the custom load event
window.addEvent('load', function(){
	loaded = true;
});

})(window, document);


/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

requires: [Array, String, Function, Number]

provides: Class

...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};

var reset = function(object){
	for (var key in object){
		var value = object[key];
		switch (typeOf(value)){
			case 'object':
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
			break;
			case 'array': object[key] = value.clone(); break;
		}
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (typeOf(value) == 'function'){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();


/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

provides: [Class.Extras, Chain, Events, Options]

...
*/

(function(){

this.Chain = new Class({

	$chain: [],

	chain: function(){
		this.$chain.append(Array.flatten(arguments));
		return this;
	},

	callChain: function(){
		return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
	},

	clearChain: function(){
		this.$chain.empty();
		return this;
	}

});

var removeOn = function(string){
	return string.replace(/^on([A-Z])/, function(full, first){
		return first.toLowerCase();
	});
};

this.Events = new Class({

	$events: {},

	addEvent: function(type, fn, internal){
		type = removeOn(type);

		/*<1.2compat>*/
		if (fn == $empty) return this;
		/*</1.2compat>*/

		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;
		return this;
	},

	addEvents: function(events){
		for (var type in events) this.addEvent(type, events[type]);
		return this;
	},

	fireEvent: function(type, args, delay){
		type = removeOn(type);
		var events = this.$events[type];
		if (!events) return this;
		args = Array.from(args);
		events.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},
	
	removeEvent: function(type, fn){
		type = removeOn(type);
		var events = this.$events[type];
		if (events && !fn.internal){
			var index =  events.indexOf(fn);
			if (index != -1) delete events[index];
		}
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		if (events) events = removeOn(events);
		for (type in this.$events){
			if (events && events != type) continue;
			var fns = this.$events[type];
			for (var i = fns.length; i--;) if (i in fns){
				this.removeEvent(type, fns[i]);
			}
		}
		return this;
	}

});

this.Options = new Class({

	setOptions: function(){
		var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
		if (this.addEvent) for (var option in options){
			if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	}

});

})();


/*
---

name: Fx

description: Contains the basic animation logic to be extended by all other Fx Classes.

license: MIT-style license.

requires: [Chain, Events, Options]

provides: Fx

...
*/

(function(){

var Fx = this.Fx = new Class({

	Implements: [Chain, Events, Options],

	options: {
		/*
		onStart: nil,
		onCancel: nil,
		onComplete: nil,
		*/
		fps: 60,
		unit: false,
		duration: 500,
		frames: null,
		frameSkip: true,
		link: 'ignore'
	},

	initialize: function(options){
		this.subject = this.subject || this;
		this.setOptions(options);
	},

	getTransition: function(){
		return function(p){
			return -(Math.cos(Math.PI * p) - 1) / 2;
		};
	},

	step: function(now){
		if (this.options.frameSkip){
			var diff = (this.time != null) ? (now - this.time) : 0, frames = diff / this.frameInterval;
			this.time = now;
			this.frame += frames;
		} else {
			this.frame++;
		}
		
		if (this.frame < this.frames){
			var delta = this.transition(this.frame / this.frames);
			this.set(this.compute(this.from, this.to, delta));
		} else {
			this.frame = this.frames;
			this.set(this.compute(this.from, this.to, 1));
			this.stop();
		}
	},

	set: function(now){
		return now;
	},

	compute: function(from, to, delta){
		return Fx.compute(from, to, delta);
	},

	check: function(){
		if (!this.isRunning()) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},

	start: function(from, to){
		if (!this.check(from, to)) return this;
		this.from = from;
		this.to = to;
		this.frame = (this.options.frameSkip) ? 0 : -1;
		this.time = null;
		this.transition = this.getTransition();
		var frames = this.options.frames, fps = this.options.fps, duration = this.options.duration;
		this.duration = Fx.Durations[duration] || duration.toInt();
		this.frameInterval = 1000 / fps;
		this.frames = frames || Math.round(this.duration / this.frameInterval);
		this.fireEvent('start', this.subject);
		pushInstance.call(this, fps);
		return this;
	},
	
	stop: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			if (this.frames == this.frame){
				this.fireEvent('complete', this.subject);
				if (!this.callChain()) this.fireEvent('chainComplete', this.subject);
			} else {
				this.fireEvent('stop', this.subject);
			}
		}
		return this;
	},
	
	cancel: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			this.frame = this.frames;
			this.fireEvent('cancel', this.subject).clearChain();
		}
		return this;
	},
	
	pause: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
		}
		return this;
	},
	
	resume: function(){
		if ((this.frame < this.frames) && !this.isRunning()) pushInstance.call(this, this.options.fps);
		return this;
	},
	
	isRunning: function(){
		var list = instances[this.options.fps];
		return list && list.contains(this);
	}

});

Fx.compute = function(from, to, delta){
	return (to - from) * delta + from;
};

Fx.Durations = {'short': 250, 'normal': 500, 'long': 1000};

// global timers

var instances = {}, timers = {};

var loop = function(){
	var now = Date.now();
	for (var i = this.length; i--;){
		var instance = this[i];
		if (instance) instance.step(now);
	}
};

var pushInstance = function(fps){
	var list = instances[fps] || (instances[fps] = []);
	list.push(this);
	if (!timers[fps]) timers[fps] = loop.periodical(Math.round(1000 / fps), list);
};

var pullInstance = function(fps){
	var list = instances[fps];
	if (list){
		list.erase(this);
		if (!list.length && timers[fps]){
			delete instances[fps];
			timers[fps] = clearInterval(timers[fps]);
		}
	}
};

})();


/*
---
name: Color
description: Class to create and manipulate colors. Includes HSB «-» RGB «-» HEX conversions. Supports alpha for each type.
requires: [Core/Type, Core/Array]
provides: Color
...
*/

(function(){

var colors = {
	maroon: '#800000', red: '#ff0000', orange: '#ffA500', yellow: '#ffff00', olive: '#808000',
	purple: '#800080', fuchsia: "#ff00ff", white: '#ffffff', lime: '#00ff00', green: '#008000',
	navy: '#000080', blue: '#0000ff', aqua: '#00ffff', teal: '#008080',
	black: '#000000', silver: '#c0c0c0', gray: '#808080'
};

var Color = this.Color = function(color, type){
	
	if (color.isColor){
		
		this.red = color.red;
		this.green = color.green;
		this.blue = color.blue;
		this.alpha = color.alpha;

	} else {
		
		var namedColor = colors[color];
		if (namedColor){
			color = namedColor;
			type = 'hex';
		}

		switch (typeof color){
			case 'string': if (!type) type = (type = color.match(/^rgb|^hsb/)) ? type[0] : 'hex'; break;
			case 'object': type = type || 'rgb'; color = color.toString(); break;
			case 'number': type = 'hex'; color = color.toString(16); break;
		}

		color = Color['parse' + type.toUpperCase()](color);
		this.red = color[0];
		this.green = color[1];
		this.blue = color[2];
		this.alpha = color[3];
	}
	
	this.isColor = true;

};

var limit = function(number, min, max){
	return Math.min(max, Math.max(min, number));
};

var listMatch = /([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,?\s*([-.\d]*)/;
var hexMatch = /^#?([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{0,2})$/i;

Color.parseRGB = function(color){
	return color.match(listMatch).slice(1).map(function(bit, i){
		return (i < 3) ? Math.round(((bit %= 256) < 0) ? bit + 256 : bit) : limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
};
	
Color.parseHEX = function(color){
	if (color.length == 1) color = color + color + color;
	return color.match(hexMatch).slice(1).map(function(bit, i){
		if (i == 3) return (bit) ? parseInt(bit, 16) / 255 : 1;
		return parseInt((bit.length == 1) ? bit + bit : bit, 16);
	});
};
	
Color.parseHSB = function(color){
	var hsb = color.match(listMatch).slice(1).map(function(bit, i){
		if (i === 0) return Math.round(((bit %= 360) < 0) ? (bit + 360) : bit);
		else if (i < 3) return limit(Math.round(bit), 0, 100);
		else return limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
	
	var a = hsb[3];
	var br = Math.round(hsb[2] / 100 * 255);
	if (hsb[1] == 0) return [br, br, br, a];
		
	var hue = hsb[0];
	var f = hue % 60;
	var p = Math.round((hsb[2] * (100 - hsb[1])) / 10000 * 255);
	var q = Math.round((hsb[2] * (6000 - hsb[1] * f)) / 600000 * 255);
	var t = Math.round((hsb[2] * (6000 - hsb[1] * (60 - f))) / 600000 * 255);

	switch (Math.floor(hue / 60)){
		case 0: return [br, t, p, a];
		case 1: return [q, br, p, a];
		case 2: return [p, br, t, a];
		case 3: return [p, q, br, a];
		case 4: return [t, p, br, a];
		default: return [br, p, q, a];
	}
};

var toString = function(type, array){
	if (array[3] != 1) type += 'a';
	else array.pop();
	return type + '(' + array.join(', ') + ')';
};

Color.prototype = {

	toHSB: function(array){
		var red = this.red, green = this.green, blue = this.blue, alpha = this.alpha;

		var max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
		var hue = 0, saturation = (max != 0) ? delta / max : 0, brightness = max / 255;
		if (saturation){
			var rr = (max - red) / delta, gr = (max - green) / delta, br = (max - blue) / delta;
			hue = (red == max) ? br - gr : (green == max) ? 2 + rr - br : 4 + gr - rr;
			if ((hue /= 6) < 0) hue++;
		}

		var hsb = [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100), alpha];

		return (array) ? hsb : toString('hsb', hsb);
	},

	toHEX: function(array){

		var a = this.alpha;
		var alpha = ((a = Math.round((a * 255)).toString(16)).length == 1) ? a + a : a;
		
		var hex = [this.red, this.green, this.blue].map(function(bit){
			bit = bit.toString(16);
			return (bit.length == 1) ? '0' + bit : bit;
		});
		
		return (array) ? hex.concat(alpha) : '#' + hex.join('') + ((alpha == 'ff') ? '' : alpha);
	},
	
	toRGB: function(array){
		var rgb = [this.red, this.green, this.blue, this.alpha];
		return (array) ? rgb : toString('rgb', rgb);
	}

};

Color.prototype.toString = Color.prototype.toRGB;

Color.hex = function(hex){
	return new Color(hex, 'hex');
};

if (this.hex == null) this.hex = Color.hex;

Color.hsb = function(h, s, b, a){
	return new Color([h || 0, s || 0, b || 0, (a == null) ? 1 : a], 'hsb');
};

if (this.hsb == null) this.hsb = Color.hsb;

Color.rgb = function(r, g, b, a){
	return new Color([r || 0, g || 0, b || 0, (a == null) ? 1 : a], 'rgb');
};

if (this.rgb == null) this.rgb = Color.rgb;

if (this.Type) new Type('Color', Color);

})();


/*
---
name: ART
description: "The heart of ART."
requires: [Core/Class, Color/Color]
provides: [ART, ART.Element, ART.Container, ART.Transform]
...
*/

(function(){

this.ART = new Class;

ART.version = '09.dev';
ART.build = 'DEV';

ART.Element = new Class({

	/* dom */

	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.element);
		return this;
	},

	eject: function(){
		var element = this.element, parent = element.parentNode;
		if (parent) parent.removeChild(element);
		return this;
	},

	/* events */

	subscribe: function(type, fn, bind){
		if (typeof type != 'string'){ // listen type / fn with object
			var subscriptions = [];
			for (var t in type) subscriptions.push(this.subscribe(t, type[t]));
			return function(){ // unsubscribe
				for (var i = 0, l = subscriptions.length; i < l; i++)
					subscriptions[i]();
				return this;
			};
		} else { // listen to one
			var bound = fn.bind(bind || this);
			var element = this.element;
			if (element.addEventListener){
				element.addEventListener(type, bound, false);
				return function(){ // unsubscribe
					element.removeEventListener(type, bound, false);
					return this;
				};
			} else {
				element.attachEvent('on' + type, bound);
				return function(){ // unsubscribe
					element.detachEvent('on' + type, bound);
					return this;
				};
			}
		}
	}

});

ART.Container = new Class({

	grab: function(){
		for (var i = 0; i < arguments.length; i++) arguments[i].inject(this);
		return this;
	}

});

var transformTo = function(xx, yx, xy, yy, x, y){
	if (xx && typeof xx == 'object'){
		yx = xx.yx; yy = xx.yy; y = xx.y;
		xy = xx.xy; x = xx.x; xx = xx.xx;
	}
	this.xx = xx == null ? 1 : xx;
	this.yx = yx || 0;
	this.xy = xy || 0;
	this.yy = yy == null ? 1 : yy;
	this.x = (x == null ? this.x : x) || 0;
	this.y = (y == null ? this.y : y) || 0;
	this._transform();
	return this;
};

ART.Transform = new Class({

	initialize: transformTo,

	_transform: function(){},

	xx: 1, yx: 0, x: 0,
	xy: 0, yy: 1, y: 0,

	transform: function(xx, yx, xy, yy, x, y){
		var m = this;
		if (xx && typeof xx == 'object'){
			yx = xx.yx; yy = xx.yy; y = xx.y;
			xy = xx.xy; x = xx.x; xx = xx.xx;
		}
		if (!x) x = 0;
		if (!y) y = 0;
		return this.transformTo(
			m.xx * xx + m.xy * yx,
			m.yx * xx + m.yy * yx,
			m.xx * xy + m.xy * yy,
			m.yx * xy + m.yy * yy,
			m.xx * x + m.xy * y + m.x,
			m.yx * x + m.yy * y + m.y
		);
	},

	transformTo: transformTo,

	translate: function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	move: function(x, y){
		this.x += x || 0;
		this.y += y || 0;
		this._transform();
		return this;
	},

	scale: function(x, y){
		if (y == null) y = x;
		return this.transform(x, 0, 0, y, 0, 0);
	},

	rotate: function(deg, x, y){
		if (x == null || y == null){
			x = (this.left || 0) + (this.width || 0) / 2;
			y = (this.top || 0) + (this.height || 0) / 2;
		}

		var rad = deg * Math.PI / 180, sin = Math.sin(rad), cos = Math.cos(rad);

		this.transform(1, 0, 0, 1, x, y);
		var m = this;

		return this.transformTo(
			cos * m.xx - sin * m.yx,
			sin * m.xx + cos * m.yx,
			cos * m.xy - sin * m.yy,
			sin * m.xy + cos * m.yy,
			m.x,
			m.y
		).transform(1, 0, 0, 1, -x, -y);
	},

	moveTo: function(x, y){
		var m = this;
		return this.transformTo(m.xx, m.yx, m.xy, m.yy, x, y);
	},

	rotateTo: function(deg, x, y){
		var m = this;
		var flip = m.yx / m.xx > m.yy / m.xy ? -1 : 1;
		if (m.xx < 0 ? m.xy >= 0 : m.xy < 0) flip = -flip;
		return this.rotate(deg - Math.atan2(flip * m.yx, flip * m.xx) * 180 / Math.PI, x, y);
	},

	scaleTo: function(x, y){
		// Normalize
		var m = this;

		var h = Math.sqrt(m.xx * m.xx + m.yx * m.yx);
		m.xx /= h; m.yx /= h;

		h = Math.sqrt(m.yy * m.yy + m.xy * m.xy);
		m.yy /= h; m.xy /= h;

		return this.scale(x, y);
	},

	resizeTo: function(width, height){
		var w = this.width, h = this.height;
		if (!w || !h) return this;
		return this.scaleTo(width / w, height / h);
	},

	point: function(x, y){
		var m = this;
		return {
			x: m.xx * x + m.xy * y + m.x,
			y: m.yx * x + m.yy * y + m.y
		};
	}

});

Color.detach = function(color){
	color = new Color(color);
	return [Color.rgb(color.red, color.green, color.blue).toString(), color.alpha];
};

})();



/*
---
name: ART.Path
description: "Class to generate a valid SVG path using method calls."
authors: ["[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.Path]
requires: [ART, ART.Transform]
...
*/

(function(){

/* private functions */

var parameterCount = {
	l: 2, z: 0,
	h: 1, v: 1,
	c: 6, s: 4,
	q: 4, t: 2,
	a: 7
};

function parse(path){

	if (!path) return [];

	var parts = [], index = -1,
	    bits = path.match(/[a-df-z]|[\-+]?(?:[\d\.]e[\-+]?|[^\s\-+,a-z])+/ig),
	    command, part, paramCount = 0;

	for (var i = 0, l = bits.length; i < l; i++){
		var bit = bits[i];
		if (bit.match(/^[a-z]/i)){
			command = bit;
			parts[++index] = part = [command];
			if (command == 'm') command = 'l';
			else if (command == 'M') command = 'L';
			paramCount = parameterCount[command.toLowerCase()];
		} else {
			if (part.length > paramCount) parts[++index] = part = [command];
			part.push(Number(bit));
		}
	}
	
	return parts;

};

function visitCurve(sx, sy, c1x, c1y, c2x, c2y, ex, ey, lineTo){
	var ax = sx - c1x,    ay = sy - c1y,
		bx = c1x - c2x,   by = c1y - c2y,
		cx = c2x - ex,    cy = c2y - ey,
		dx = ex - sx,     dy = ey - sy;

	// TODO: Faster algorithm without sqrts
	var err = Math.sqrt(ax * ax + ay * ay) +
	          Math.sqrt(bx * bx + by * by) +
	          Math.sqrt(cx * cx + cy * cy) -
	          Math.sqrt(dx * dx + dy * dy);

	if (err <= 0.0001){
		lineTo(sx, sy, ex, ey);
		return;
	}

	// Split curve
	var s1x =   (c1x + c2x) / 2,   s1y = (c1y + c2y) / 2,
	    l1x =   (c1x + sx) / 2,    l1y = (c1y + sy) / 2,
	    l2x =   (l1x + s1x) / 2,   l2y = (l1y + s1y) / 2,
	    r2x =   (ex + c2x) / 2,    r2y = (ey + c2y) / 2,
	    r1x =   (r2x + s1x) / 2,   r1y = (r2y + s1y) / 2,
	    l2r1x = (l2x + r1x) / 2,   l2r1y = (l2y + r1y) / 2;

	// TODO: Manual stack if necessary. Currently recursive without tail optimization.
	visitCurve(sx, sy, l1x, l1y, l2x, l2y, l2r1x, l2r1y, lineTo);
	visitCurve(l2r1x, l2r1y, r1x, r1y, r2x, r2y, ex, ey, lineTo);
};

var circle = Math.PI * 2;

function visitArc(rx, ry, rotation, large, clockwise, x, y, tX, tY, curveTo, arcTo){
	var rad = rotation * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
	x -= tX; y -= tY;
	
	// Ellipse Center
	var cx = cos * x / 2 + sin * y / 2,
		cy = -sin * x / 2 + cos * y / 2,
		rxry = rx * rx * ry * ry,
		rycx = ry * ry * cx * cx,
		rxcy = rx * rx * cy * cy,
		a = rxry - rxcy - rycx;

	if (a < 0){
		a = Math.sqrt(1 - a / rxry);
		rx *= a; ry *= a;
		cx = x / 2; cy = y / 2;
	} else {
		a = Math.sqrt(a / (rxcy + rycx));
		if (large == clockwise) a = -a;
		var cxd = -a * cy * rx / ry,
		    cyd =  a * cx * ry / rx;
		cx = cos * cxd - sin * cyd + x / 2;
		cy = sin * cxd + cos * cyd + y / 2;
	}

	// Rotation + Scale Transform
	var xx =  cos / rx, yx = sin / rx,
	    xy = -sin / ry, yy = cos / ry;

	// Start and End Angle
	var sa = Math.atan2(xy * -cx + yy * -cy, xx * -cx + yx * -cy),
	    ea = Math.atan2(xy * (x - cx) + yy * (y - cy), xx * (x - cx) + yx * (y - cy));

	cx += tX; cy += tY;
	x += tX; y += tY;

	// Circular Arc
	if (rx == ry && arcTo){
		arcTo(
			tX, tY, x, y,
			cx, cy, rx, sa, ea, !clockwise
		);
		return;
	}

	// Inverse Rotation + Scale Transform
	xx = cos * rx; yx = -sin * ry;
	xy = sin * rx; yy =  cos * ry;

	// Bezier Curve Approximation
	var arc = ea - sa;
	if (arc < 0 && clockwise) arc += circle;
	else if (arc > 0 && !clockwise) arc -= circle;

	var n = Math.ceil(Math.abs(arc / (circle / 4))),
	    step = arc / n,
	    k = (4 / 3) * Math.tan(step / 4),
	    a = sa;

	x = Math.cos(a); y = Math.sin(a);

	for (var i = 0; i < n; i++){
		var cp1x = x - k * y, cp1y = y + k * x;

		a += step;
		x = Math.cos(a); y = Math.sin(a);

		var cp2x = x + k * y, cp2y = y - k * x;

		curveTo(
			tX, tY,
			cx + xx * cp1x + yx * cp1y, cy + xy * cp1x + yy * cp1y,
			cx + xx * cp2x + yx * cp2y, cy + xy * cp2x + yy * cp2y,
			(tX = (cx + xx * x + yx * y)), (tY = (cy + xy * x + yy * y))
		);
	}
};

/* Measure bounds */

var left, right, top, bottom;

function lineBounds(sx, sy, x, y){
	left   = Math.min(left,   sx, x);
	right  = Math.max(right,  sx, x);
	top    = Math.min(top,    sy, y);
	bottom = Math.max(bottom, sy, y);
};

function curveBounds(sx, sy, p1x, p1y, p2x, p2y, x, y){
	left   = Math.min(left,   sx, p1x, p2x, x);
	right  = Math.max(right,  sx, p1x, p2x, x);
	top    = Math.min(top,    sy, p1y, p2y, y);
	bottom = Math.max(bottom, sy, p1y, p2y, y);
};

var west = circle / 2, south = west / 2, north = -south, east = 0;

function arcBounds(sx, sy, ex, ey, cx, cy, r, sa, ea, ccw){
	var bbsa = ccw ? ea : sa, bbea = ccw ? sa : ea;
	if (bbea < bbsa) bbea += circle;

	// Bounds
	var bbl = (bbea > west) ? (cx - r) : (ex),
	    bbr = (bbea > circle + east || (bbsa < east && bbea > east)) ? (cx + r) : (ex),
	    bbt = (bbea > circle + north || (bbsa < north && bbea > north)) ? (cy - r) : (ey),
	    bbb = (bbea > circle + south || (bbsa < south && bbea > south)) ? (cy + r) : (ey);

	left   = Math.min(left,   sx, bbl, bbr);
	right  = Math.max(right,  sx, bbl, bbr);
	top    = Math.min(top,    sy, bbt, bbb);
	bottom = Math.max(bottom, sy, bbt, bbb);
};

/* Measure length */

var length, desiredLength, desiredPoint;

function traverseLine(sx, sy, ex, ey){
	var x = ex - sx,
		y = ey - sy,
		l = Math.sqrt(x * x + y * y);
	length += l;
	if (length >= desiredLength){
		var offset = (length - desiredLength) / l,
		    cos = x / l,
		    sin = y / l;
		ex -= x * offset; ey -= y * offset;
		desiredPoint = new ART.Transform(cos, sin, -sin, cos, ex, ey);
		desiredLength = Infinity;
	}
};

function measureLine(sx, sy, ex, ey){
	var x = ex - sx, y = ey - sy;
	length += Math.sqrt(x * x + y * y);
};

/* Utility command factories */

var point = function(c){
	return function(x, y){
		return this.push(c, x, y);
	};
};

var arc = function(c, cc){
	return function(x, y, rx, ry, outer){
		return this.push(c, Math.abs(rx || x), Math.abs(ry || rx || y), 0, outer ? 1 : 0, cc, x, y);
	};
};

var curve = function(t, q, c){
	return function(c1x, c1y, c2x, c2y, ex, ey){
		var args = Array.slice(arguments), l = args.length;
		args.unshift(l < 4 ? t : l < 6 ? q : c);
		return this.push.apply(this, args);
	};
};

/* Path Class */

ART.Path = new Class({
	
	initialize: function(path){
		if (path instanceof ART.Path){ //already a path, copying
			this.path = Array.slice(path.path);
			this.cache = path.cache;
		} else {
			this.path = (path == null) ? [] : parse(path);
			this.cache = { svg: String(path) };
		}
	},
	
	push: function(){ //modifying the current path resets the memoized values.
		this.cache = {};
		this.path.push(Array.slice(arguments));
		return this;
	},
	
	reset: function(){
		this.cache = {};
		this.path = [];
		return this;
	},
	
	/*utility*/
	
	move: point('m'),
	moveTo: point('M'),
	
	line: point('l'),
	lineTo: point('L'),
	
	curve: curve('t', 'q', 'c'),
	curveTo: curve('T', 'Q', 'C'),
	
	arc: arc('a', 1),
	arcTo: arc('A', 1),
	
	counterArc: arc('a', 0),
	counterArcTo: arc('A', 0),
	
	close: function(){
		return this.push('z');
	},
	
	/* visitor */

	visit: function(lineTo, curveTo, arcTo, moveTo, close){
		var reflect = function(sx, sy, ex, ey){
			return [ex * 2 - sx, ey * 2 - sy];
		};
		
		if (!curveTo) curveTo = function(sx, sy, c1x, c1y, c2x, c2y, ex, ey){
			visitCurve(sx, sy, c1x, c1y, c2x, c2y, ex, ey, lineTo);
		};
		
		var X = 0, Y = 0, px = 0, py = 0, r, inX, inY;
		
		var parts = this.path;
		
		for (i = 0; i < parts.length; i++){
			var v = Array.slice(parts[i]), f = v.shift(), l = f.toLowerCase();
			var refX = l == f ? X : 0, refY = l == f ? Y : 0;
			
			if (l != 'm' && l != 'z' && inX == null){
				inX = X; inY = Y;
			}

			switch (l){
				
				case 'm':
					if (moveTo) moveTo(X, Y, X = refX + v[0], Y = refY + v[1]);
					else { X = refX + v[0]; Y = refY + v[1]; }
				break;
				
				case 'l':
					lineTo(X, Y, X = refX + v[0], Y = refY + v[1]);
				break;
				
				case 'c':
					px = refX + v[2]; py = refY + v[3];
					curveTo(X, Y, refX + v[0], refY + v[1], px, py, X = refX + v[4], Y = refY + v[5]);
				break;

				case 's':
					r = reflect(px, py, X, Y);
					px = refX + v[0]; py = refY + v[1];
					curveTo(X, Y, r[0], r[1], px, py, X = refX + v[2], Y = refY + v[3]);
				break;
				
				case 'q':
					px = (refX + v[0]); py = (refY + v[1]);
					curveTo(X, Y, (X + px * 2) / 3, (Y + py * 2) / 3, ((X = refX + v[2]) + px * 2) / 3, ((Y = refY + v[3]) + py * 2) / 3, X, Y);
				break;
				
				case 't':
					r = reflect(px, py, X, Y);
					px = r[0]; py = r[1];
					curveTo(X, Y, (X + px * 2) / 3, (Y + py * 2) / 3, ((X = refX + v[0]) + px * 2) / 3, ((Y = refY + v[1]) + py * 2) / 3, X, Y);
				break;

				case 'a':
					px = refX + v[5]; py = refY + v[6];
					if (!v[0] || !v[1] || (px == X && py == Y)) lineTo(X, Y, px, py);
					else visitArc(v[0], v[1], v[2], v[3], v[4], px, py, X, Y, curveTo, arcTo);
					X = px; Y = py;
				break;

				case 'h':
					lineTo(X, Y, X = refX + v[0], Y);
				break;
				
				case 'v':
					lineTo(X, Y, X, Y = refY + v[0]);
				break;
				
				case 'z':
					if (inX != null){
						if (close){
							close();
							if (moveTo) moveTo(X, Y, X = inX, Y = inY);
							else { X = inX; Y = inY; }
						} else {
							lineTo(X, Y, X = inX, Y = inY);
						}
						inX = null;
					}
				break;
				
			}
			if (l != 's' && l != 'c' && l != 't' && l != 'q'){
				px = X; py = Y;
			}
		}
	},
	
	/* transformation, measurement */
	
	toSVG: function(){
		if (this.cache.svg == null){
			var path = '';
			for (var i = 0, l = this.path.length; i < l; i++) path += this.path[i].join(' ');
			this.cache.svg = path;
		}
		return this.cache.svg;
	},
	
	measure: function(){
		if (this.cache.box == null){
			left = top = Infinity;
			right = bottom = -Infinity;
			this.visit(lineBounds, curveBounds, arcBounds);
			if (left == Infinity)
				this.cache.box = {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
			else
				this.cache.box = {left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top };
		}
		return this.cache.box;
	},

	point: function(lengthToPoint){
		length = 0;
		desiredLength = lengthToPoint;
		desiredPoint = null;
		this.visit(traverseLine);
		return desiredPoint;
	},

	measureLength: function(){
		length = 0;
		this.visit(measureLine);
		return length;
	}

});

ART.Path.prototype.toString = ART.Path.prototype.toSVG;

})();

/*
---
name: ART.SVG
description: "SVG implementation for ART"
provides: [ART.SVG, ART.SVG.Group, ART.SVG.Shape, ART.SVG.Image, ART.SVG.Text]
requires: [ART, ART.Element, ART.Container, ART.Transform, ART.Path]
...
*/

(function(){
	
var NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink', XML = 'http://www.w3.org/XML/1998/namespace',
    UID = 0,
    createElement = function(tag){
        return document.createElementNS(NS, tag);
    };

var ua = navigator && navigator.userAgent,
    hasBaseline = !(/opera|safari|ie/i).test(ua) || (/chrome/i).test(ua);

// SVG Base Class

ART.SVG = new Class({

	Extends: ART.Element,
	Implements: ART.Container,

	initialize: function(width, height){
		var element = this.element = createElement('svg');
		element.setAttribute('xmlns', NS);
		element.setAttribute('version', 1.1);
		var defs = this.defs = createElement('defs');
		element.appendChild(defs);
		if (width != null && height != null) this.resize(width, height);
	},

	resize: function(width, height){
		var element = this.element;
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		this.width = width;
		this.height = height;
		return this;
	},
	
	toElement: function(){
		return this.element;
	}

});

// SVG Element Class

ART.SVG.Element = new Class({
	
	Extends: ART.Element,
	
	Implements: ART.Transform,

	initialize: function(tag){
		this.uid = String.uniqueID();
		var element = this.element = createElement(tag);
		element.setAttribute('id', 'e' + this.uid);
	},
	
	/* transforms */
	
	_transform: function(){
		var m = this;
		this.element.setAttribute('transform', 'matrix(' + [m.xx, m.yx, m.xy, m.yy, m.x, m.y] + ')');
	},
	
	blend: function(opacity){
		this.element.setAttribute('opacity', opacity);
		return this;
	},
	
	// visibility
	
	hide: function(){
		this.element.setAttribute('display', 'none');
		return this;
	},
	
	show: function(){
		this.element.setAttribute('display', '');
		return this;
	},
	
	// interaction
	
	indicate: function(cursor, tooltip){
		var element = this.element;
		if (cursor) this.element.style.cursor = cursor;
		if (tooltip){
			var title = this.titleElement; 
			if (title){
				title.firstChild.nodeValue = tooltip;
			} else {
				this.titleElement = title = createElement('title');
				title.appendChild(document.createTextNode(tooltip));
				element.insertBefore(title, element.firstChild);
			}
		}
		return this;
	}

});

// SVG Group Class

ART.SVG.Group = new Class({
	
	Extends: ART.SVG.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.parent('g');
		this.width = width;
		this.height = height;
		this.defs = createElement('defs');
		this.element.appendChild(this.defs);
	}
	
});

// SVG Base Shape Class

ART.SVG.Base = new Class({
	
	Extends: ART.SVG.Element,

	initialize: function(tag){
		this.parent(tag);
		this.fill();
		this.stroke();
	},
	
	/* insertions */
	
	inject: function(container){
		this.eject();
		this.container = container;
		this._injectBrush('fill');
		this._injectBrush('stroke');
		this.parent(container);
		return this;
	},
	
	eject: function(){
		if (this.container){
			this.parent();
			this._ejectBrush('fill');
			this._ejectBrush('stroke');
			this.container = null;
		}
		return this;
	},
	
	_injectBrush: function(type){
		if (!this.container) return;
		var brush = this[type + 'Brush'];
		if (brush) this.container.defs.appendChild(brush);
	},
	
	_ejectBrush: function(type){
		if (!this.container) return;
		var brush = this[type + 'Brush'];
		if (brush) this.container.defs.removeChild(brush);
	},
	
	/* styles */
	
	_createBrush: function(type, tag){
		this._ejectBrush(type);

		var brush = createElement(tag);
		this[type + 'Brush'] = brush;

		var id = type + '-brush-e' + this.uid;
		brush.setAttribute('id', id);

		this._injectBrush(type);

		this.element.setAttribute(type, 'url(#' + id + ')');

		return brush;
	},

	_createGradient: function(type, style, stops){
		var gradient = this._createBrush(type, style);

		var addColor = function(offset, color){
			color = Color.detach(color);
			var stop = createElement('stop');
			stop.setAttribute('offset', offset);
			stop.setAttribute('stop-color', color[0]);
			stop.setAttribute('stop-opacity', color[1]);
			gradient.appendChild(stop);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		// TODO: Sort. Chrome doesn't always enumerate in expected order but requires stops to be specified in order.
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);

		gradient.setAttribute('spreadMethod', 'reflect'); // Closer to the VML gradient


		this.element.removeAttribute('fill-opacity');
		return gradient;
	},
	
	_setColor: function(type, color){
		this._ejectBrush(type);
		this[type + 'Brush'] = null;
		var element = this.element;
		if (color == null){
			element.setAttribute(type, 'none');
			element.removeAttribute(type + '-opacity');
		} else {
			color = Color.detach(color);
			element.setAttribute(type, color[0]);
			element.setAttribute(type + '-opacity', color[1]);
		}
	},

	fill: function(color){
		if (arguments.length > 1) this.fillLinear(arguments);
		else this._setColor('fill', color);
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var gradient = this._createGradient('fill', 'radialGradient', stops);

		gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
		

		if (focusX == null) focusX = (this.left || 0) + (this.width || 0) * 0.5;
		if (focusY == null) focusY = (this.top || 0) + (this.height || 0) * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5) || 0;
		if (radiusX == null) radiusX = (this.width || 0) * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;
		
		var ys = radiusY / radiusX;

		gradient.setAttribute('fx', focusX);
		gradient.setAttribute('fy', focusY / ys);

		gradient.setAttribute('r', radiusX);
		if (ys != 1) gradient.setAttribute('gradientTransform', 'scale(1,' + ys + ')');

		gradient.setAttribute('cx', centerX);
		gradient.setAttribute('cy', centerY / ys);
		
		return this;
	},

	fillLinear: function(stops, x1, y1, x2, y2){
		var gradient = this._createGradient('fill', 'linearGradient', stops);
		
		if (arguments.length == 5){
			gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
		} else {
			var angle = ((x1 == null) ? 270 : x1) * Math.PI / 180;

			var x = Math.cos(angle), y = -Math.sin(angle),
				l = (Math.abs(x) + Math.abs(y)) / 2;

			x *= l; y *= l;

			x1 = 0.5 - x;
			x2 = 0.5 + x;
			y1 = 0.5 - y;
			y2 = 0.5 + y;
		}

		gradient.setAttribute('x1', x1);
		gradient.setAttribute('y1', y1);
		gradient.setAttribute('x2', x2);
		gradient.setAttribute('y2', y2);

		return this;
	},

	fillImage: function(url, width, height, left, top, color1, color2){
		var pattern = this._createBrush('fill', 'pattern');

		var image = createElement('image');
		image.setAttributeNS(XLINK, 'href', url);
		image.setAttribute('width', width);
		image.setAttribute('height', height);
		image.setAttribute('preserveAspectRatio', 'none'); // none, xMidYMid slice, xMidYMid meet

		if (color1 != null){
			color1 = new Color(color1);
			if (color2 == null){
				color2 = new Color(color1);
				color2.alpha = 0;
			} else {
				color2 = new Color(color2);
			}

			var r = (color1.red - color2.red) / (255 * 3),
				g = (color1.green - color2.green) / (255 * 3),
				b = (color1.blue - color2.blue) / (255 * 3),
				a = (color1.alpha - color2.alpha) / 3;
			
			var matrix = [
				r, r, r, 0, color2.red / 255,
				g, g, g, 0, color2.green / 255,
				b, b, b, 0, color2.blue / 255,
				a, a, a, 0, color2.alpha
			];

			var filter = createElement('filter');
			filter.setAttribute('id', 'testfilter' + this.uid);

			var cm = createElement('feColorMatrix');
			cm.setAttribute('type', 'matrix');
			cm.setAttribute('values', matrix.join(' '));

			image.setAttribute('fill', '#000');
			image.setAttribute('filter', 'url(#testfilter' + this.uid + ')');

			filter.appendChild(cm);
			pattern.appendChild(filter);
		}

		pattern.appendChild(image);
		
		pattern.setAttribute('patternUnits', 'userSpaceOnUse');
		pattern.setAttribute('patternContentsUnits', 'userSpaceOnUse');
		
		pattern.setAttribute('x', left || 0);
		pattern.setAttribute('y', top || 0);
		
		pattern.setAttribute('width', width);
		pattern.setAttribute('height', height);

		//pattern.setAttribute('viewBox', '0 0 75 50');
		//pattern.setAttribute('preserveAspectRatio', 'xMidYMid slice');

		return this;
	},

	stroke: function(color, width, cap, join){
		var element = this.element;
		element.setAttribute('stroke-width', (width != null) ? width : 1);
		element.setAttribute('stroke-linecap', (cap != null) ? cap : 'round');
		element.setAttribute('stroke-linejoin', (join != null) ? join : 'round');

		this._setColor('stroke', color);
		return this;
	}
	
});

// SVG Shape Class

ART.SVG.Shape = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(path, width, height){
		this.parent('path');
		this.element.setAttribute('fill-rule', 'evenodd');
		this.width = width;
		this.height = height;
		if (path != null) this.draw(path);
	},
	
	draw: function(path, width, height){
		if (!(path instanceof ART.Path)) path = new ART.Path(path);
		this.element.setAttribute('d', path.toSVG());
		if (width != null) this.width = width;
		if (height != null) this.height = height;
		return this;
	}

});

ART.SVG.Image = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(src, width, height){
		this.parent('image');
		if (arguments.length == 3) this.draw.apply(this, arguments);
	},
	
	draw: function(src, width, height){
		var element = this.element;
		element.setAttributeNS(XLINK, 'href', src);
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		this.width = width;
		this.height = height;
		return this;
	}
	
});

var fontAnchors = { left: 'start', center: 'middle', right: 'end' },
    fontAnchorOffsets = { middle: '50%', end: '100%' };

/* split each continuous line into individual paths */

var splitPaths, splitPath;

function splitMove(sx, sy, x, y){
	if (splitPath.length > 3) splitPaths.push(splitPath);
	splitPath = ['M', x, y];
};

function splitLine(sx, sy, x, y){
	splitPath.push('L', x, y);
};

function splitCurve(sx, sy, p1x, p1y, p2x, p2y, x, y){
	splitPath.push('C', p1x, p1y, p2x, p2y, x, y);
};

ART.SVG.Text = new Class({

	Extends: ART.SVG.Base,

	initialize: function(text, font, alignment, path){
		this.parent('text');
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element;
	
		if (font){
			if (typeof font == 'string'){
				element.style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// if (ckey == 'kerning') element.setAttribute('kerning', font[key] ? 'auto' : '0');
					// else if (ckey == 'letterSpacing') element.setAttribute('letter-spacing', Number(font[key]) + 'ex');
					// else if (ckey == 'rotateGlyphs') element.setAttribute('glyph-orientation-horizontal', font[key] ? '270deg' : '');
					// else
					element.style[ckey] = font[key];
				}
				element.style.lineHeight = '0.5em';
			}
		}
		
		if (alignment) element.setAttribute('text-anchor', this.textAnchor = (fontAnchors[alignment] || alignment));

		if (path && typeof path != 'number'){
			this._createPaths(new ART.Path(path));
		} else if (path === false){
			this._ejectPaths();
			this.pathElements = null;
		}
		
		var paths = this.pathElements, child;
		
		while ((child = element.firstChild)){
			element.removeChild(child);
		}
		
		// Note: Gecko will (incorrectly) align gradients for each row, while others applies one for the entire element
		
		var lines = String(text).split(/\r?\n/), l = lines.length,
		    baseline = 'central';
		
		if (paths && l > paths.length) l = paths.length;
		
		if (hasBaseline) element.setAttribute('dominant-baseline', baseline);

		element.setAttributeNS(XML, 'space', 'preserve');
		
		for (var i = 0; i < l; i++){
			var line = lines[i], row, content;
			if (paths){
				row = createElement('textPath');
				row.setAttributeNS(XLINK, 'href', '#' + paths[i].getAttribute('id'));
				row.setAttribute('startOffset', fontAnchorOffsets[this.textAnchor] || 0);
			} else {
				row = createElement('tspan');
				row.setAttribute('x', 0);
				row.setAttribute('y', (i * 1.1 + 0.5) + 'em');
			}
			if (hasBaseline){
				row.setAttribute('dominant-baseline', baseline);
				content = row;
			} else if (paths){
				content = createElement('tspan');
				content.setAttribute('dy', '0.35em');
				row.appendChild(content);
			} else {
				content = row;
				row.setAttribute('y', (i * 1.1 + 0.85) + 'em');
			}
			content.setAttributeNS(XML, 'space', 'preserve');
			content.appendChild(document.createTextNode(line));
			element.appendChild(row);
		}
		
		// Measure
		// TODO: Move to lazy ES5 left/top/width/height/bottom/right property getters
		var bb;
		try { bb = element.getBBox(); } catch (x){ }
		if (!bb || !bb.width) bb = this._whileInDocument(element.getBBox, element);
		
		this.left = bb.x;
		this.top = bb.y;
		this.width = bb.width;
		this.height = bb.height;
		this.right = bb.x + bb.width;
		this.bottom = bb.y + bb.height;
		return this;
	},
	
	// TODO: Unify path injection with gradients and imagefills

	inject: function(container){
		this.parent(container);
		this._injectPaths();
		return this;
	},
	
	eject: function(){
		if (this.container){
			this._ejectPaths();
			this.parent();
			this.container = null;
		}
		return this;
	},
	
	_injectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths.length; i < l; i++)
			defs.appendChild(paths[i]);
	},
	
	_ejectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths; i < l; i++)
			defs.removeChild(paths[i]);
	},
	
	_createPaths: function(path){
		this._ejectPaths();
		var id = 'p' + String.uniqueID() + '-';
		
		splitPaths = []; splitPath = ['M', 0, 0];
		path.visit(splitLine, splitCurve, null, splitMove);
		splitPaths.push(splitPath);
		
		var result = [];
		for (var i = 0, l = splitPaths.length; i < l; i++){
			var p = createElement('path');
			p.setAttribute('d', splitPaths[i].join(' '));
			p.setAttribute('id', id + i);
			result.push(p);
		}
		this.pathElements = result;
		this._injectPaths();
	},
	
	_whileInDocument: function(fn, bind){
		// Temporarily inject into the document
		var element = this.element,
		    container = this.container,
			parent = element.parentNode,
			sibling = element.nextSibling,
			body = element.ownerDocument.body,
			canvas = new ART.SVG(1, 1).inject(body);
		this.inject(canvas);
		var result = fn.call(bind);
		canvas.eject();
		if (container) this.inject(container);
		if (parent) parent.insertBefore(element, sibling);
		return result;
	}

});

})();

/*
---
name: ART.VML
description: "VML implementation for ART"
authors: ["[Simo Kinnunen](http://twitter.com/sorccu)", "[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.VML, ART.VML.Group, ART.VML.Shape, ART.VML.Text]
requires: [ART, ART.Element, ART.Container, ART.Transform, ART.Path]
...
*/

(function(){

var precision = 100, UID = 0;

var defaultBox = { left: 0, top: 0, width: 500, height: 500 };

// VML Base Class

ART.VML = new Class({

	Extends: ART.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.vml = document.createElement('vml');
		this.element = document.createElement('av:group');
		this.vml.appendChild(this.element);
		this.children = [];
		if (width != null && height != null) this.resize(width, height);
	},
	
	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.vml);
		return this;
	},
	
	resize: function(width, height){
		this.width = width;
		this.height = height;
		
		var style = this.vml.style;
		style.pixelWidth = width;
		style.pixelHeight = height;
		
		style = this.element.style;
		style.width = width;
		style.height = height;
		
		var halfPixel = (0.5 * precision);
		
		this.element.coordorigin = halfPixel + ',' + halfPixel;
		this.element.coordsize = (width * precision) + ',' + (height * precision);

		return this;
	},
	
	toElement: function(){
		return this.vml;
	}
	
});

// VML Initialization

var VMLCSS = 'behavior:url(#default#VML);display:inline-block;position:absolute;left:0px;top:0px;';

var styleSheet, styledTags = {}, styleTag = function(tag){
	if (styleSheet) styledTags[tag] = styleSheet.addRule('av\\:' + tag, VMLCSS);
};

ART.VML.init = function(document){

	var namespaces = document.namespaces;
	if (!namespaces) return false;

	namespaces.add('av', 'urn:schemas-microsoft-com:vml');
	namespaces.add('ao', 'urn:schemas-microsoft-com:office:office');

	styleSheet = document.createStyleSheet();
	styleSheet.addRule('vml', 'display:inline-block;position:relative;overflow:hidden;');
	styleTag('skew');
	styleTag('fill');
	styleTag('stroke');
	styleTag('path');
	styleTag('textpath');
	styleTag('group');

	return true;

};

// VML Element Class

ART.VML.Element = new Class({
	
	Extends: ART.Element,
	
	Implements: ART.Transform,
	
	initialize: function(tag){
		this.uid = String.uniqueID();
		if (!(tag in styledTags)) styleTag(tag);

		var element = this.element = document.createElement('av:' + tag);
		element.setAttribute('id', 'e' + this.uid);
	},
	
	/* dom */
	
	inject: function(container){
		this.eject();
		this.container = container;
		container.children.include(this);
		this._transform();
		this.parent(container);
		
		return this;
	},

	eject: function(){
		if (this.container){
			this.container.children.erase(this);
			this.container = null;
			this.parent();
		}
		return this;
	},

	// visibility
	
	hide: function(){
		this.element.style.display = 'none';
		return this;
	},
	
	show: function(){
		this.element.style.display = '';
		return this;
	},
	
	// interaction
	
	indicate: function(cursor, tooltip){
		if (cursor) this.element.style.cursor = cursor;
		if (tooltip) this.element.title = tooltip;
		return this;
	}

});

// VML Group Class

ART.VML.Group = new Class({
	
	Extends: ART.VML.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.parent('group');
		this.width = width;
		this.height = height;
		this.children = [];
	},
	
	/* dom */
	
	inject: function(container){
		this.parent(container);
		this._transform();
		return this;
	},
	
	eject: function(){
		this.parent();
		return this;
	},
	
	_transform: function(){
		var element = this.element;
		element.coordorigin = '0,0';
		element.coordsize = '1000,1000';
		element.style.left = 0;
		element.style.top = 0;
		element.style.width = 1000;
		element.style.height = 1000;
		element.style.rotation = 0;
		
		var container = this.container;
		this._activeTransform = container ? new ART.Transform(container._activeTransform).transform(this) : this;
		var children = this.children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i]._transform();
	}

});

// VML Base Shape Class

ART.VML.Base = new Class({

	Extends: ART.VML.Element,
	
	initialize: function(tag){
		this.parent(tag);
		var element = this.element;
		
		var skew = this.skewElement = document.createElement('av:skew');
		skew.on = true;
		element.appendChild(skew);

		var fill = this.fillElement = document.createElement('av:fill');
		fill.on = false;
		element.appendChild(fill);
		
		var stroke = this.strokeElement = document.createElement('av:stroke');
		stroke.on = false;
		element.appendChild(stroke);
	},
	
	/* transform */
	
	_transform: function(){
		var container = this.container;
		
		// Active Transformation Matrix
		var m = container ? new ART.Transform(container._activeTransform).transform(this) : this;
		
		// Box in shape user space
		
		var box = this._boxCoords || this._size || defaultBox;
		
		var originX = box.left || 0,
			originY = box.top || 0,
			width = box.width || 1,
			height = box.height || 1;
				
		// Flipped
	    var flip = m.yx / m.xx > m.yy / m.xy;
		if (m.xx < 0 ? m.xy >= 0 : m.xy < 0) flip = !flip;
		flip = flip ? -1 : 1;
		
		m = new ART.Transform().scale(flip, 1).transform(m);
		
		// Rotation is approximated based on the transform
		var rotation = Math.atan2(-m.xy, m.yy) * 180 / Math.PI;
		
		// Reverse the rotation, leaving the final transform in box space
		var rad = rotation * Math.PI / 180, sin = Math.sin(rad), cos = Math.cos(rad);
		
		var transform = new ART.Transform(
			(m.xx * cos - m.xy * sin),
			(m.yx * cos - m.yy * sin) * flip,
			(m.xy * cos + m.xx * sin) * flip,
			(m.yy * cos + m.yx * sin)
		);

		var rotationTransform = new ART.Transform().rotate(rotation, 0, 0);

		var shapeToBox = new ART.Transform().rotate(-rotation, 0, 0).transform(m).moveTo(0,0);

		// Scale box after reversing rotation
		width *= Math.abs(shapeToBox.xx);
		height *= Math.abs(shapeToBox.yy);
		
		// Place box
		var left = m.x, top = m.y;
		
		// Compensate for offset by center origin rotation
		var vx = -width / 2, vy = -height / 2;
		var point = rotationTransform.point(vx, vy);
		left -= point.x - vx;
		top -= point.y - vy;
		
		// Adjust box position based on offset
		var rsm = new ART.Transform(m).moveTo(0,0);
		point = rsm.point(originX, originY);
		left += point.x;
		top += point.y;
		
		if (flip < 0) left = -left - width;
		
		// Place transformation origin
		var point0 = rsm.point(-originX, -originY);
		var point1 = rotationTransform.point(width, height);
		var point2 = rotationTransform.point(width, 0);
		var point3 = rotationTransform.point(0, height);
		
		var minX = Math.min(0, point1.x, point2.x, point3.x),
		    maxX = Math.max(0, point1.x, point2.x, point3.x),
		    minY = Math.min(0, point1.y, point2.y, point3.y),
		    maxY = Math.max(0, point1.y, point2.y, point3.y);
		
		var transformOriginX = (point0.x - point1.x / 2) / (maxX - minX) * flip,
		    transformOriginY = (point0.y - point1.y / 2) / (maxY - minY);
		
		// Adjust the origin
		point = shapeToBox.point(originX, originY);
		originX = point.x;
		originY = point.y;
		
		// Scale stroke
		var strokeWidth = this._strokeWidth;
		if (strokeWidth){
			// Scale is the hypothenus between the two vectors
			// TODO: Use area calculation instead
			var vx = m.xx + m.xy, vy = m.yy + m.yx;
			strokeWidth *= Math.sqrt(vx * vx + vy * vy) / Math.sqrt(2);
		}
		
		// convert to multiplied precision space
		originX *= precision;
		originY *= precision;
		left *= precision;
		top *= precision;
		width *= precision;
		height *= precision;
		
		// Set box
		var element = this.element;
		element.coordorigin = originX + ',' + originY;
		element.coordsize = width + ',' + height;
		element.style.left = left + 'px';
		element.style.top = top + 'px';
		element.style.width = width;
		element.style.height = height;
		element.style.rotation = rotation.toFixed(8);
		element.style.flip = flip < 0 ? 'x' : '';
		
		// Set transform
		var skew = this.skewElement;
		skew.matrix = [transform.xx.toFixed(4), transform.xy.toFixed(4), transform.yx.toFixed(4), transform.yy.toFixed(4), 0, 0];
		skew.origin = transformOriginX + ',' + transformOriginY;

		// Set stroke
		this.strokeElement.weight = strokeWidth + 'px';
	},
	
	/* styles */

	_createGradient: function(style, stops){
		var fill = this.fillElement;

		// Temporarily eject the fill from the DOM
		this.element.removeChild(fill);

		fill.type = style;
		fill.method = 'none';
		fill.rotate = true;

		var colors = [], color1, color2;

		var addColor = function(offset, color){
			color = Color.detach(color);
			if (color1 == null) color1 = color2 = color;
			else color2 = color;
			colors.push(offset + ' ' + color[0]);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);
		
		fill.color = color1[0];
		fill.color2 = color2[0];
		
		//if (fill.colors) fill.colors.value = colors; else
		fill.colors = colors;

		// Opacity order gets flipped when color stops are specified
		fill.opacity = color2[1];
		fill['ao:opacity2'] = color1[1];

		fill.on = true;
		this.element.appendChild(fill);
		return fill;
	},
	
	_setColor: function(type, color){
		var element = this[type + 'Element'];
		if (color == null){
			element.on = false;
		} else {
			color = Color.detach(color);
			element.color = color[0];
			element.opacity = color[1];
			element.on = true;
		}
	},
	
	fill: function(color){
		if (arguments.length > 1){
			this.fillLinear(arguments);
		} else {
			this._boxCoords = defaultBox;
			var fill = this.fillElement;
			fill.type = 'solid';
			fill.color2 = '';
			fill['ao:opacity2'] = '';
			if (fill.colors) fill.colors.value = '';
			this._setColor('fill', color);
		}
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var fill = this._createGradient('gradientradial', stops);
		if (focusX == null) focusX = this.left + this.width * 0.5;
		if (focusY == null) focusY = this.top + this.height * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5);
		if (radiusX == null) radiusX = this.width * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;
		
		centerX += centerX - focusX;
		centerY += centerY - focusY;
		
		var box = this._boxCoords = {
			left: centerX - radiusX * 2,
			top: centerY - radiusY * 2,
			width: radiusX * 4,
			height: radiusY * 4
		};
		focusX -= box.left;
		focusY -= box.top;
		focusX /= box.width;
		focusY /= box.height;

		fill.focussize = '0 0';
		fill.focusposition = focusX + ',' + focusY;
		fill.focus = '50%';
		
		this._transform();
		
		return this;
	},

	fillLinear: function(stops, x1, y1, x2, y2){
		var fill = this._createGradient('gradient', stops);
		fill.focus = '100%';
		if (arguments.length == 5){
			var w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
			this._boxCoords = {
				left: Math.min(x1, x2),
				top: Math.min(y1, y2),
				width: w < 1 ? h : w,
				height: h < 1 ? w : h
			};
			fill.angle = (360 + Math.atan2((x2 - x1) / h, (y2 - y1) / w) * 180 / Math.PI) % 360;
		} else {
			this._boxCoords = null;
			fill.angle = (x1 == null) ? 0 : (90 + x1) % 360;
		}
		this._transform();
		return this;
	},

	fillImage: function(url, width, height, left, top, color1, color2){
		var fill = this.fillElement;
		if (color1 != null){
			color1 = Color.detach(color1);
			if (color2 != null) color2 = Color.detach(color2);
			fill.type = 'pattern';
			fill.color = color1[0];
			fill.color2 = color2 == null ? color1[0] : color2[0];
			fill.opacity = color2 == null ? 0 : color2[1];
			fill['ao:opacity2'] = color1[1];
		} else {
			fill.type = 'tile';
			fill.color = '';
			fill.color2 = '';
			fill.opacity = 1;
			fill['ao:opacity2'] = 1;
		}
		if (fill.colors) fill.colors.value = '';
		fill.rotate = true;
		fill.src = url;
		
		fill.size = '1,1';
		fill.position = '0,0';
		fill.origin = '0,0';
		fill.aspect = 'ignore'; // ignore, atleast, atmost
		fill.on = true;

		if (!left) left = 0;
		if (!top) top = 0;
		this._boxCoords = width ? { left: left + 0.5, top: top + 0.5, width: width, height: height } : null;
		this._transform();
		return this;
	},

	/* stroke */
	
	stroke: function(color, width, cap, join){
		var stroke = this.strokeElement;
		this._strokeWidth = (width != null) ? width : 1;
		stroke.weight = (width != null) ? width + 'px' : 1;
		stroke.endcap = (cap != null) ? ((cap == 'butt') ? 'flat' : cap) : 'round';
		stroke.joinstyle = (join != null) ? join : 'round';

		this._setColor('stroke', color);
		return this;
	}

});

// VML Shape Class

ART.VML.Shape = new Class({

	Extends: ART.VML.Base,
	
	initialize: function(path, width, height){
		this.parent('shape');

		var p = this.pathElement = document.createElement('av:path');
		p.gradientshapeok = true;
		this.element.appendChild(p);
		
		this.width = width;
		this.height = height;
		
		if (path != null) this.draw(path);
	},
	
	// SVG to VML
	
	draw: function(path, width, height){
		
		if (!(path instanceof ART.Path)) path = new ART.Path(path);
		this._vml = path.toVML(precision);
		this._size = path.measure();
		
		if (width != null) this.width = width;
		if (height != null) this.height = height;
		
		if (!this._boxCoords) this._transform();
		this._redraw(this._prefix, this._suffix);
		
		return this;
	},
	
	// radial gradient workaround

	_redraw: function(prefix, suffix){
		var vml = this._vml || '';

		this._prefix = prefix;
		this._suffix = suffix
		if (prefix){
			vml = [
				prefix, vml, suffix,
				// Don't stroke the path with the extra ellipse, redraw the stroked path separately
				'ns e', vml, 'nf'
			].join(' ');
		}

		this.element.path = vml + 'e';
	},

	fill: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillLinear: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillImage: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var fill = this._createGradient('gradientradial', stops);
		if (focusX == null) focusX = (this.left || 0) + (this.width || 0) * 0.5;
		if (focusY == null) focusY = (this.top || 0) + (this.height || 0) * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5) || 0;
		if (radiusX == null) radiusX = (this.width || 0) * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;

		centerX += centerX - focusX;
		centerY += centerY - focusY;
		
		var cx = Math.round(centerX * precision),
			cy = Math.round(centerY * precision),

			rx = Math.round(radiusX * 2 * precision),
			ry = Math.round(radiusY * 2 * precision),

			arc = ['wa', cx - rx, cy - ry, cx + rx, cy + ry].join(' ');

		this._redraw(
			// Resolve rendering bug
			['m', cx, cy - ry, 'l', cx, cy - ry].join(' '),
			// Draw an ellipse around the path to force an elliptical gradient on any shape
			[
				'm', cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry
			].join(' ')
		);

		this._boxCoords = { left: focusX - 2, top: focusY - 2, width: 4, height: 4 };
		
		fill.focusposition = '0.5,0.5';
		fill.focussize = '0 0';
		fill.focus = '50%';
		
		this._transform();
		
		return this;
	}

});

var fontAnchors = { start: 'left', middle: 'center', end: 'right' };

ART.VML.Text = new Class({

	Extends: ART.VML.Base,

	initialize: function(text, font, alignment, path){
		this.parent('shape');
		
		var p = this.pathElement = document.createElement('av:path');
		p.textpathok = true;
		this.element.appendChild(p);
		
		p = this.textPathElement = document.createElement("av:textpath");
		p.on = true;
		p.style['v-text-align'] = 'left';
		this.element.appendChild(p);
		
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element,
		    textPath = this.textPathElement,
		    style = textPath.style;
		
		textPath.string = text;
		
		if (font){
			if (typeof font == 'string'){
				style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					if (ckey == 'fontFamily') style[ckey] = "'" + font[key] + "'";
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// else if (ckey == 'kerning') style['v-text-kern'] = !!font[key];
					// else if (ckey == 'rotateGlyphs') style['v-rotate-letters'] = !!font[key];
					// else if (ckey == 'letterSpacing') style['v-text-spacing'] = Number(font[key]) + '';
					else style[ckey] = font[key];
				}
			}
		}
		
		if (alignment) style['v-text-align'] = fontAnchors[alignment] || alignment;
		
		if (path){
			this.currentPath = path = new ART.Path(path);
			this.element.path = path.toVML(precision);
		} else if (!this.currentPath){
			var i = -1, offsetRows = '\n';
			while ((i = text.indexOf('\n', i + 1)) > -1) offsetRows += '\n';
			textPath.string = offsetRows + textPath.string;
			this.element.path = 'm0,0l1,0';
		}
		
		// Measuring the bounding box is currently necessary for gradients etc.
		
		// Clone element because the element is dead once it has been in the DOM
		element = element.cloneNode(true);
		style = element.style;
		
		// Reset coordinates while measuring
		element.coordorigin = '0,0';
		element.coordsize = '10000,10000';
		style.left = '0px';
		style.top = '0px';
		style.width = '10000px';
		style.height = '10000px';
		style.rotation = 0;
		element.removeChild(element.firstChild); // Remove skew
		
		// Inject the clone into the document
		
		var canvas = new ART.VML(1, 1),
		    group = new ART.VML.Group(), // Wrapping it in a group seems to alleviate some client rect weirdness
		    body = element.ownerDocument.body;
		
		canvas.inject(body);
		group.element.appendChild(element);
		group.inject(canvas);
		
		var ebb = element.getBoundingClientRect(),
		    cbb = canvas.toElement().getBoundingClientRect();
		
		canvas.eject();
		
		this.left = ebb.left - cbb.left;
		this.top = ebb.top - cbb.top;
		this.width = ebb.right - ebb.left;
		this.height = ebb.bottom - ebb.top;
		this.right = ebb.right - cbb.left;
		this.bottom = ebb.bottom - cbb.top;
		
		this._transform();

		this._size = { left: this.left, top: this.top, width: this.width, height: this.height};
		return this;
	}

});

// VML Path Extensions

var path, p, round = Math.round;

function moveTo(sx, sy, x, y){
	path.push('m', round(x * p), round(y * p));
};

function lineTo(sx, sy, x, y){
	path.push('l', round(x * p), round(y * p));
};

function curveTo(sx, sy, p1x, p1y, p2x, p2y, x, y){
	path.push('c',
		round(p1x * p), round(p1y * p),
		round(p2x * p), round(p2y * p),
		round(x * p), round(y * p)
	);
};

function arcTo(sx, sy, ex, ey, cx, cy, r, sa, ea, ccw){
	cx *= p;
	cy *= p;
	r *= p;
	path.push(ccw ? 'at' : 'wa',
		round(cx - r), round(cy - r),
		round(cx + r), round(cy + r),
		round(sx * p), round(sy * p),
		round(ex * p), round(ey * p)
	);
};

function close(){
	path.push('x');
};

ART.Path.implement({

	toVML: function(precision){
		if (this.cache.vml == null){
			path = [];
			p = precision;
			this.visit(lineTo, curveTo, arcTo, moveTo, close);
			this.cache.vml = path.join(' ');
		}
		return this.cache.vml;
	}

});

})();

/*
---
name: ART.Base
description: "Implements ART, ART.Shape and ART.Group based on the current browser."
provides: [ART.Base, ART.Group, ART.Shape, ART.Text]
requires: [ART.VML, ART.SVG]
...
*/

(function(){
	
var SVG = function(){

	var implementation = document.implementation;
	return (implementation && implementation.hasFeature && implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

};

var VML = function(){

	return ART.VML.init(document);

};

var MODE = SVG() ? 'SVG' : VML() ? 'VML' : null;
if (!MODE) return;

ART.Shape = new Class({Extends: ART[MODE].Shape});
ART.Group = new Class({Extends: ART[MODE].Group});
ART.Text = new Class({Extends: ART[MODE].Text});
ART.implement({Extends: ART[MODE]});

})();


/*
---
name: ART.Shapes
description: "Shapes for ART"
authors: ["[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.Shapes, ART.Rectangle, ART.Pill, ART.Ellipse, ART.Wedge]
requires: [ART.Path, ART.Shape]
...
*/

ART.Rectangle = new Class({

	Extends: ART.Shape,
	
	initialize: function(width, height, radius){
		this.parent();
		if (width != null && height != null) this.draw(width, height, radius);
	},
	
	draw: function(width, height, radius){

		var path = new ART.Path;

		if (!radius){

			path.move(0, 0).line(width, 0).line(0, height).line(-width, 0).line(0, -height);

		} else {

			if (typeof radius == 'number') radius = [radius, radius, radius, radius];

			var tl = radius[0], tr = radius[1], br = radius[2], bl = radius[3];

			if (tl < 0) tl = 0;
			if (tr < 0) tr = 0;
			if (bl < 0) bl = 0;
			if (br < 0) br = 0;

			path.move(0, tl);

			if (width < 0) path.move(width, 0);
			if (height < 0) path.move(0, height);

			if (tl > 0) path.arc(tl, -tl);
			path.line(Math.abs(width) - (tr + tl), 0);

			if (tr > 0) path.arc(tr, tr);
			path.line(0, Math.abs(height) - (tr + br));

			if (br > 0) path.arc(-br, br);
			path.line(- Math.abs(width) + (br + bl), 0);

			if (bl > 0) path.arc(-bl, -bl);
			path.line(0, - Math.abs(height) + (bl + tl));
		}
		
		path.close();

		return this.parent(path, width, height);
	}

});

ART.Pill = new Class({
	
	Extends: ART.Rectangle,
	
	draw: function(width, height){
		return this.parent(width, height, ((width < height) ? width : height) / 2);
	}
	
});

ART.Ellipse = new Class({
	
	Extends: ART.Shape,
	
	initialize: function(width, height){
		this.parent();
		if (width != null && height != null) this.draw(width, height);
	},
	
	draw: function(width, height){
		var path = new ART.Path;
		var rx = width / 2, ry = height / 2;
		path.move(0, ry).arc(width, 0, rx, ry).arc(-width, 0, rx, ry);
		
		path.close();
		
		return this.parent(path, width, height);
	}

});

ART.Wedge = new Class({

	Extends: ART.Shape,

	initialize: function(innerRadius, outerRadius, startAngle, endAngle){
		this.parent();
		if (innerRadius != null || outerRadius != null) this.draw(innerRadius, outerRadius, startAngle, endAngle);
	},

	draw: function(innerRadius, outerRadius, startAngle, endAngle){
		var path = new ART.Path;

		var circle = Math.PI * 2,
			radiansPerDegree = Math.PI / 180,
			sa = startAngle * radiansPerDegree % circle || 0,
			ea = endAngle * radiansPerDegree % circle || 0,
			ir = Math.min(innerRadius || 0, outerRadius || 0),
			or = Math.max(innerRadius || 0, outerRadius || 0),
			a = sa > ea ? circle - sa + ea : ea - sa;

		if (a >= circle){

			path.move(0, or).arc(or * 2, 0, or).arc(-or * 2, 0, or);
			if (ir) path.move(or - ir, 0).counterArc(ir * 2, 0, ir).counterArc(-ir * 2, 0, ir);

		} else {

			var ss = Math.sin(sa), es = Math.sin(ea),
				sc = Math.cos(sa), ec = Math.cos(ea),
				ds = es - ss, dc = ec - sc, dr = ir - or,
				large = a > Math.PI;

			path.move(or + or * ss, or - or * sc).arc(or * ds, or * -dc, or, or, large).line(dr * es, dr * -ec);
			if (ir) path.counterArc(ir * -ds, ir * dc, ir, ir, large);

		}

		path.close();
		return this.parent(path, or * 2, or * 2);
	}

});

/*
---
name: ART.Font
description: "Fonts for ART, implements code from [Cufón](http://cufon.shoqolate.com/)"
authors: ["[Simo Kinnunen](http://twitter.com/sorccu)", "[Valerio Proietti](http://mad4milk.net/)"]
provides: ART.Font
requires: ART.Shape
...
*/

(function(){

var fonts = {};

ART.registerFont = function(font){
	var face = font.face,
	    family = face['font-family'],
	    weight = (face['font-weight'] > 400 ? 'bold' : 'normal'),
	    style = (face['font-stretch'] == 'oblique' ? 'italic' : 'normal');
	fonts[weight + style + name] = font;
	return this;
};

var VMLToSVG = function(path, s, x, y){
	var end = '';
	var regexp = /([mrvxe])([^a-z]*)/g, match;
	while ((match = regexp.exec(path))){
		var c = match[2].split(',');
		switch (match[1]){
			case 'v': end += 'c ' + (s * c[0]) + ',' + (s * c[1]) + ',' + (s * c[2]) + ',' + (s * c[3]) + ',' + (s * c[4]) + ',' + (s * c[5]); break;
			case 'r': end += 'l ' + (s * c[0]) + ',' + (s * c[1]); break;
			case 'm': end += 'M ' + (x + (s * c[0])) + ',' + (y + (s * c[1])); break;
			case 'x': end += 'z'; break;
		}
	}
	
	return end;
};

var parseFontString = function(font){
	var regexp = /^\s*((?:(?:normal|bold|italic)\s+)*)(?:(\d+(?:\.\d+)?)[ptexm\%]*(?:\s*\/.*?)?\s+)?\s*\"?([^\"]*)/i,
	    match = regexp.exec(font);
	return {
		fontFamily: match[3],
		fontSize: match[2],
		fontStyle: (/italic/.exec(match[1]) || ''),
		fontWeight: (/bold/.exec(match[1]) || '')
	};
};

ART.Font = new Class({
	
	Extends: ART.Shape,
	
	initialize: function(text, font){
		this.parent();
		if (text != null && font != null) this.draw(text, font);
	},
	
	draw: function(text, font){
		if (typeof font == 'string') font = parseFontString(font);
		
		var family = font.fontFamily || font['font-family'],
			weight = font.fontWeight || font['font-weight'] || 'normal',
			style = font.fontStyle || font['font-style'] || 'normal',
			size = parseFloat(font.fontSize || font['font-size'] || font.size);
		
		font = font.glyphs ? font : fonts[weight + style + name];
		
		if (!font) throw new Error('The specified font has not been found.');
		size = size / font.face['units-per-em'];
		
		var width = 0, height = size * font.face.ascent, path = '';

		for (var i = 0, l = text.length; i < l; ++i){
			var glyph = font.glyphs[text.charAt(i)] || font.glyphs[' '];
			var w = size * (glyph.w || font.w);
			if (glyph.d) path += VMLToSVG('m' + glyph.d + 'x', size, width, height);
			width += w;
		}
		
		height -= size * font.face.descent;
		
		return this.parent(path, width, height);
	}

});

})();


/*
---

name: Moderna

description: MgOpen Moderna built with [Cufón](http://wiki.github.com/sorccu/cufon/about)

provides: Moderna

requires: ART.Font

...
*/

/*!
 * The following copyright notice may not be removed under any circumstances.
 * 
 * Copyright:
 * Copyright (c) Magenta ltd, 2004.
 * 
 * Manufacturer:
 * Magenta ltd
 * 
 * Vendor URL:
 * http://www.magenta.gr
 * 
 * License information:
 * http://www.ellak.gr/fonts/MgOpen/license.html
 */

ART.registerFont({"w":205,"face":{"font-family":"Moderna","font-weight":400,"font-stretch":"normal","units-per-em":"360","panose-1":"2 11 5 3 0 2 0 6 0 4","ascent":"288","descent":"-72","x-height":"6","bbox":"-20 -279 328 86","underline-thickness":"18","underline-position":"-27","unicode-range":"U+0020-U+007E"},"glyphs":{" ":{"w":97},"!":{"d":"9,-63v0,-20,-9,-93,-9,-114r0,-85r36,0v2,71,-3,135,-9,199r-18,0xm36,0r-36,0r0,-39r36,0r0,39","w":61},"\"":{"d":"77,-157r-24,0r0,-99r24,0r0,99xm25,-157r-25,0r0,-99r25,0r0,99","w":102},"#":{"d":"250,-179r-10,26r-54,0r-16,47r57,0r-9,26r-58,0r-28,81r-30,0r29,-81r-46,0r-29,81r-29,0r28,-81r-55,0r9,-26r55,0r17,-47r-59,0r9,-26r59,0r29,-82r30,0r-29,82r46,0r29,-82r29,0r-28,82r54,0xm157,-153r-47,0r-16,47r47,0","w":275},"$":{"d":"3,-188v-1,-41,36,-67,77,-67r0,-24r19,0r0,24v41,0,75,27,73,69r-32,0v-4,-23,-17,-38,-41,-40r0,83v49,9,82,29,82,80v0,47,-32,70,-82,69r0,33r-19,0r0,-33v-50,1,-81,-32,-80,-83r32,0v0,32,17,54,48,56r0,-93v-47,-9,-75,-25,-77,-74xm80,-226v-37,-5,-56,41,-33,66v7,7,18,10,33,13r0,-79xm99,-20v46,-2,59,-45,35,-74v-8,-8,-19,-14,-35,-16r0,90"},"%":{"d":"282,-63v0,37,-27,63,-63,63v-36,0,-63,-27,-63,-63v0,-36,26,-64,63,-64v36,0,63,28,63,64xm184,-63v0,21,15,36,35,36v22,0,35,-16,35,-36v0,-21,-14,-38,-35,-37v-21,0,-35,16,-35,37xm230,-256r-156,263r-22,0r156,-263r22,0xm125,-185v0,36,-26,64,-62,64v-37,0,-65,-28,-64,-64v0,-36,26,-63,63,-63v37,0,63,26,63,63xm99,-185v0,-21,-15,-37,-36,-37v-23,-1,-37,17,-37,38v0,21,14,36,36,36v23,0,37,-16,37,-37","w":307},"&":{"d":"161,-85v6,-14,8,-20,11,-43r31,0v0,24,-7,48,-20,69r49,59r-44,0r-26,-32v-20,23,-46,43,-82,43v-49,0,-76,-38,-81,-83v5,-40,30,-58,65,-79v-15,-18,-28,-34,-28,-61v-1,-34,29,-59,64,-58v35,0,62,23,61,57v-2,34,-23,53,-49,69xm94,-163v21,-15,35,-23,37,-49v1,-19,-14,-31,-31,-31v-31,-2,-45,34,-25,58v4,6,10,13,19,22xm35,-73v0,59,76,70,109,19r-62,-76v-25,15,-47,27,-47,57","w":257},"'":{"d":"36,-262v2,43,0,79,-36,88r0,-16v14,-2,18,-19,19,-36r-19,0r0,-36r36,0","w":61},"(":{"d":"82,-265v-65,92,-63,248,0,340r-22,0v-33,-44,-60,-101,-60,-170v0,-70,26,-124,60,-170r22,0","w":107},")":{"d":"23,-265v33,46,59,99,59,170v0,70,-25,126,-59,170r-23,0v63,-91,65,-248,0,-340r23,0","w":107},"*":{"d":"175,-199r-52,14r35,44r-23,17r-32,-45r-32,44r-25,-16r36,-44r-52,-14r10,-28r49,16r0,-51r27,0r0,51r49,-16"},"+":{"d":"199,-96r-84,0r0,96r-25,0r0,-96r-84,0r0,-25r84,0r0,-97r25,0r0,97r84,0r0,25"},",":{"d":"37,-39v2,45,0,84,-37,93r0,-18v13,-4,18,-17,18,-36r-18,0r0,-39r37,0","w":61},"-":{"d":"91,-82r-88,0r0,-29r88,0r0,29","w":123},".":{"d":"37,0r-37,0r0,-39r37,0r0,39","w":61},"\/":{"d":"158,-270r-89,303r-21,0r87,-303r23,0"},"0":{"d":"102,-256v112,1,112,263,0,264v-111,-3,-112,-261,0,-264xm102,-226v-72,9,-72,196,0,203v72,-7,72,-196,0,-203"},"1":{"d":"56,-206v44,-1,57,-14,67,-50r26,0r0,256r-34,0r0,-181r-59,0r0,-25"},"2":{"d":"106,-256v44,0,84,32,84,76v0,84,-120,83,-138,148r138,0r0,32r-175,0v0,-33,11,-60,36,-81v32,-27,102,-51,104,-98v1,-27,-22,-45,-48,-46v-32,0,-54,27,-53,62r-33,0v-1,-53,32,-93,85,-93"},"3":{"d":"150,-136v77,29,37,142,-46,142v-55,0,-91,-31,-90,-86r34,0v-1,34,21,55,55,55v31,0,54,-18,53,-48v-2,-37,-28,-45,-72,-45r0,-29v41,0,60,-5,63,-39v1,-24,-20,-43,-44,-42v-33,1,-51,21,-50,57r-33,0v0,-52,29,-86,80,-86v43,0,82,27,82,69v0,26,-15,41,-32,52"},"4":{"d":"193,-63r-37,0r0,63r-33,0r0,-63r-110,0r0,-32r110,-153r33,0r0,156r37,0r0,29xm123,-92r0,-114r-81,114r81,0"},"5":{"d":"55,-150v52,-43,136,2,136,69v0,76,-94,111,-151,69v-18,-13,-26,-31,-26,-54r34,0v6,25,23,43,51,43v31,0,57,-26,57,-58v0,-58,-77,-72,-105,-33r-30,0r20,-134r136,0r0,30r-111,0"},"6":{"d":"50,-134v40,-54,142,-22,142,53v0,48,-40,90,-88,89v-60,-2,-90,-55,-90,-122v0,-99,76,-181,153,-123v16,12,23,31,23,52r-34,0v-2,-42,-62,-57,-87,-21v-12,18,-19,41,-19,72xm105,-22v29,-1,51,-23,51,-55v0,-32,-21,-57,-51,-57v-30,0,-51,23,-51,56v0,32,21,56,51,56"},"7":{"d":"190,-218v-56,66,-86,121,-103,218r-37,0v17,-97,48,-149,104,-215r-139,0r0,-33r175,0r0,30"},"8":{"d":"182,-189v0,25,-15,42,-34,52v25,10,43,34,43,64v0,46,-40,80,-88,80v-48,0,-89,-33,-89,-79v0,-32,18,-54,43,-65v-20,-10,-34,-27,-34,-51v-1,-86,160,-90,159,-1xm58,-187v0,25,19,40,45,40v25,0,43,-16,43,-39v0,-24,-19,-40,-44,-40v-25,0,-44,15,-44,39xm50,-73v0,29,23,50,53,50v29,0,52,-22,52,-50v0,-28,-22,-48,-52,-48v-30,0,-53,19,-53,48"},"9":{"d":"99,-256v62,0,93,53,93,120v0,103,-74,183,-153,124v-17,-13,-24,-31,-24,-51r34,0v0,41,64,58,87,21v11,-17,19,-40,19,-72v-45,56,-141,22,-141,-54v0,-50,36,-88,85,-88xm49,-171v0,32,19,56,51,55v30,0,52,-24,52,-55v0,-30,-22,-55,-52,-55v-31,0,-52,25,-51,55"},":":{"d":"37,-152r-37,0r0,-39r37,0r0,39xm37,0r-37,0r0,-39r37,0r0,39","w":61},";":{"d":"37,-152r-37,0r0,-39r37,0r0,39xm37,-39v2,45,0,84,-37,93r0,-18v13,-6,18,-15,18,-36r-18,0r0,-39r37,0","w":61},"<":{"d":"201,-11r-196,-87r0,-23r196,-86r0,28r-160,70r160,70r0,28"},"=":{"d":"203,-132r-200,0r0,-25r200,0r0,25xm203,-61r-200,0r0,-25r200,0r0,25"},">":{"d":"201,-98r-196,87r0,-28r158,-70r-158,-70r0,-28r196,86r0,23"},"?":{"d":"78,-271v61,-2,105,68,63,115v-20,23,-50,42,-48,85r-32,0v-5,-60,58,-77,62,-127v2,-25,-21,-44,-45,-44v-30,0,-47,26,-46,59r-32,0v-1,-51,29,-86,78,-88xm96,0r-36,0r0,-39r36,0r0,39","w":182},"@":{"d":"163,32v41,0,87,-15,112,-34r10,14v-30,22,-73,41,-121,41v-95,3,-164,-57,-164,-147v0,-94,81,-167,178,-167v85,0,148,49,149,127v1,60,-43,115,-102,113v-25,0,-33,-8,-34,-31v-11,18,-27,30,-54,31v-36,1,-54,-25,-56,-60v-4,-67,86,-138,129,-72r10,-20r23,0r-27,115v0,10,8,15,18,15v40,0,66,-45,66,-89v0,-68,-50,-108,-122,-108v-85,0,-154,63,-153,146v0,76,59,128,138,126xm143,-40v43,-8,47,-31,61,-87v-2,-19,-17,-32,-37,-32v-32,-1,-58,40,-57,75v0,23,11,44,33,44","w":351},"A":{"d":"235,0r-39,0r-28,-78r-103,0r-28,78r-37,0r98,-262r39,0xm158,-109r-41,-116r-41,116r82,0","w":261,"k":{"y":54,"w":44,"v":55,"t":29,"s":12,"q":17,"o":17,"j":8,"i":8,"g":17,"f":27,"e":17,"d":26,"c":18,"a":8,"Z":8,"Y":79,"W":57,"V":78,"U":19,"T":77,"S":22,"Q":28,"O":28,"J":27,"G":29,"C":27}},"B":{"d":"190,-199v0,29,-18,49,-40,58v31,3,52,27,52,60v1,48,-41,81,-90,81r-112,0r0,-262v81,1,189,-16,190,63xm153,-193v0,-49,-66,-40,-117,-40r0,81v51,1,117,7,117,-41xm165,-78v0,-53,-72,-46,-129,-45r0,91v57,1,129,7,129,-46","w":227,"k":{"z":10,"x":8,"Z":13,"Y":30,"X":25,"W":16,"V":21,"T":21,"A":17}},"C":{"d":"122,-26v41,0,74,-32,73,-72r35,0v2,60,-53,105,-112,105v-75,0,-118,-61,-118,-139v0,-78,46,-138,122,-138v55,0,107,36,106,86r-35,0v-6,-31,-34,-55,-70,-55v-54,0,-88,50,-88,107v0,56,32,106,87,106","w":244,"k":{"Z":18,"Y":28,"X":30,"W":11,"V":18,"T":19,"A":20}},"D":{"d":"215,-135v0,71,-47,135,-116,135r-99,0r0,-262r101,0v69,-2,114,57,114,127xm176,-132v0,-51,-30,-100,-78,-100r-62,0r0,200r62,0v49,1,78,-48,78,-100","w":242,"k":{"Z":32,"Y":41,"X":44,"W":20,"V":28,"T":35,"J":13,"A":31}},"E":{"d":"191,0r-191,0r0,-262r188,0r0,32r-152,0r0,78r140,0r0,31r-140,0r0,89r155,0r0,32","w":204,"k":{"y":24,"w":22,"v":25,"t":22,"q":12,"o":12,"g":12,"f":24,"e":12,"d":16,"c":12,"Y":7,"T":10,"S":12,"Q":9,"O":9,"J":15,"G":9,"C":9}},"F":{"d":"177,-230r-141,0r0,79r123,0r0,32r-123,0r0,119r-36,0r0,-262r177,0r0,32","w":185,"k":{"z":75,"y":25,"x":37,"w":22,"v":26,"u":8,"t":18,"s":17,"r":8,"q":13,"p":8,"o":12,"n":8,"m":8,"g":12,"f":21,"e":12,"d":15,"c":12,"a":19,"Z":10,"S":9,"Q":8,"O":8,"J":98,"G":8,"C":8,"A":49}},"G":{"d":"37,-132v0,57,34,108,88,108v47,0,82,-40,81,-89r-82,0r0,-29r115,0r0,142r-23,0r-8,-35v-18,24,-48,41,-86,42v-70,2,-122,-65,-122,-137v0,-109,109,-178,198,-118v22,16,34,37,37,64r-35,0v-7,-32,-37,-56,-74,-56v-55,0,-89,51,-89,108","w":262,"k":{"Y":32,"W":14,"V":21,"T":23}},"H":{"d":"208,0r-35,0r0,-123r-137,0r0,123r-36,0r0,-262r36,0r0,107r137,0r0,-107r35,0r0,262","w":237},"I":{"d":"47,0r-36,0r0,-262r36,0r0,262","w":75},"J":{"d":"75,-25v35,0,41,-20,41,-62r0,-175r36,0r0,190v0,53,-25,79,-77,79v-56,-1,-75,-33,-75,-92r35,0v0,34,9,60,40,60","w":181,"k":{"A":13}},"K":{"d":"212,0r-44,0r-92,-132r-40,39r0,93r-36,0r0,-262r36,0r0,126r126,-126r48,0r-107,106","w":234,"k":{"y":55,"w":45,"v":56,"u":13,"t":30,"s":19,"q":27,"o":27,"g":27,"f":24,"e":27,"d":32,"c":27,"a":13,"Y":7,"T":10,"S":28,"Q":39,"O":39,"J":29,"G":39,"C":37}},"L":{"d":"167,0r-167,0r0,-262r36,0r0,229r131,0r0,33","w":180,"k":{"y":47,"w":39,"v":48,"t":24,"q":12,"o":12,"j":8,"i":8,"g":12,"f":27,"e":12,"d":20,"c":12,"Z":8,"Y":79,"W":51,"V":71,"U":13,"T":77,"S":15,"Q":27,"O":27,"J":18,"G":27,"C":24}},"M":{"d":"247,0r-35,0r0,-225r-73,225r-34,0r-72,-224r0,224r-33,0r0,-262r52,0r70,221r75,-221r50,0r0,262","w":276},"N":{"d":"208,0r-39,0r-135,-213r0,213r-34,0r0,-262r39,0r135,212r0,-212r34,0r0,262","w":236},"O":{"d":"0,-131v0,-77,52,-139,126,-139v73,0,122,62,122,137v0,77,-49,140,-123,140v-75,0,-125,-62,-125,-138xm37,-131v0,57,33,106,88,106v53,0,86,-50,86,-106v0,-57,-32,-106,-86,-106v-54,0,-88,49,-88,106","w":273,"k":{"Z":28,"Y":39,"X":40,"W":18,"V":26,"T":31,"J":10,"A":28}},"P":{"d":"188,-186v0,45,-35,75,-81,75r-71,0r0,111r-36,0r0,-262r110,0v44,-1,78,31,78,76xm154,-187v0,-50,-65,-44,-118,-43r0,88v54,2,118,4,118,-45","w":208,"k":{"z":11,"x":8,"s":13,"q":17,"o":17,"g":17,"e":17,"d":20,"c":17,"a":17,"Z":26,"Y":30,"X":32,"W":14,"V":20,"T":20,"S":9,"J":104,"A":54}},"Q":{"d":"126,-270v121,0,159,165,90,243r31,26r-17,22r-37,-30v-91,48,-193,-18,-193,-122v0,-77,51,-139,126,-139xm37,-131v0,72,58,132,127,99r-29,-24r17,-22r36,28v52,-56,27,-189,-63,-189v-55,0,-88,51,-88,108","w":277,"k":{"Y":39,"W":18,"V":26,"T":32,"J":10}},"R":{"d":"194,-190v0,27,-16,50,-36,60v28,15,31,25,31,76v0,31,11,37,14,54r-41,0v-6,-9,-10,-30,-10,-63v0,-62,-61,-48,-116,-49r0,112r-36,0r0,-262v87,-1,194,-12,194,72xm159,-190v0,-48,-70,-43,-123,-42r0,89v56,2,123,3,123,-47","w":235,"k":{"y":9,"w":8,"v":9,"t":8,"s":12,"q":11,"o":11,"j":8,"i":8,"g":10,"f":9,"e":11,"d":18,"c":11,"a":10,"Z":8,"Y":38,"W":22,"V":28,"T":28,"S":14,"Q":12,"O":12,"J":23,"G":12,"C":11}},"S":{"d":"103,-242v-29,-1,-64,19,-61,45v9,67,162,33,162,121v0,78,-120,108,-174,58v-19,-18,-30,-40,-30,-69r34,0v0,39,27,65,66,65v32,0,71,-19,68,-48v-7,-69,-159,-35,-159,-122v0,-74,107,-101,158,-56v19,16,29,36,29,62r-34,0v0,-34,-24,-56,-59,-56","w":230,"k":{"z":13,"y":8,"x":10,"v":8,"Z":15,"Y":35,"X":27,"W":19,"V":25,"T":25,"J":9,"A":20}},"T":{"d":"202,-231r-83,0r0,231r-36,0r0,-231r-83,0r0,-31r202,0r0,31","w":216,"k":{"z":65,"y":64,"x":64,"w":63,"v":65,"u":58,"t":18,"s":63,"r":58,"q":61,"p":58,"o":61,"n":58,"m":58,"g":61,"f":22,"e":61,"d":65,"c":62,"a":62,"Z":10,"S":12,"Q":22,"O":22,"J":72,"G":21,"C":19,"A":66}},"U":{"d":"102,-28v39,0,68,-33,68,-74r0,-160r36,0r0,160v2,61,-44,108,-106,108v-61,0,-100,-46,-100,-108r0,-160r36,0r0,160v-1,41,26,74,66,74","w":234,"k":{"Z":10,"A":21}},"V":{"d":"224,-262r-93,262r-37,0r-94,-262r37,0r76,219r73,-219r38,0","w":243,"k":{"z":24,"y":19,"x":21,"w":18,"v":19,"u":13,"t":15,"s":31,"r":12,"q":35,"p":11,"o":35,"n":11,"m":11,"g":35,"f":15,"e":35,"d":39,"c":35,"a":35,"Z":10,"S":18,"Q":21,"O":21,"J":54,"G":21,"C":20,"A":72}},"W":{"d":"328,-262r-70,262r-35,0r-60,-217r-58,217r-36,0r-69,-262r35,0r54,209r55,-209r38,0r57,208r55,-208r34,0","w":350,"k":{"z":18,"y":13,"x":15,"w":12,"v":13,"u":7,"t":10,"s":24,"q":26,"o":25,"g":25,"f":10,"e":26,"d":30,"c":25,"a":27,"Z":10,"S":15,"Q":15,"O":15,"J":42,"G":15,"C":15,"A":54}},"X":{"d":"221,0r-44,0r-67,-106r-67,106r-43,0r90,-135r-85,-127r43,0r63,97r64,-97r42,0r-86,127","w":243,"k":{"y":42,"w":41,"v":42,"u":11,"t":27,"s":17,"q":25,"o":25,"g":25,"f":22,"e":24,"d":30,"c":24,"a":11,"Y":7,"T":10,"S":26,"Q":36,"O":36,"J":27,"G":36,"C":34}},"Y":{"d":"212,-262r-87,154r0,108r-36,0r0,-108r-89,-154r36,0r71,124r69,-124r36,0","w":229,"k":{"z":37,"y":32,"x":34,"w":31,"v":32,"u":26,"t":24,"s":48,"r":25,"q":55,"p":23,"o":54,"n":22,"m":22,"g":55,"f":28,"e":55,"d":58,"c":54,"a":53,"Z":10,"S":23,"Q":31,"O":31,"J":75,"G":31,"C":29,"A":69}},"Z":{"d":"202,0r-202,0r0,-30r161,-202r-151,0r0,-30r192,0r0,32r-158,198r158,0r0,32","w":219,"k":{"y":25,"w":24,"v":25,"t":18,"q":10,"o":10,"g":10,"f":20,"e":9,"d":13,"c":9,"S":9,"Q":18,"O":18,"J":12,"G":17,"C":15}},"[":{"d":"71,73r-71,0r0,-335r71,0r0,24r-39,0r0,286r39,0r0,25","w":96},"\\":{"d":"110,33r-23,0r-87,-303r22,0","w":135},"]":{"d":"71,73r-71,0r0,-25r39,0r0,-286r-39,0r0,-24r71,0r0,335","w":96},"^":{"d":"155,-200r-21,0r-31,-41r-31,41r-22,0r35,-62r35,0"},"_":{"d":"183,86r-183,0r0,-26r183,0r0,26","w":208},"`":{"d":"36,-181r-36,0v-2,-43,-2,-81,36,-89r0,17v-16,1,-18,19,-18,36r18,0r0,36","w":61},"a":{"d":"86,-200v40,0,74,24,74,62v0,36,-3,78,2,110v1,6,12,5,19,4r0,24v-22,10,-52,2,-51,-25v-27,43,-135,45,-130,-25v3,-46,32,-57,85,-63v34,-4,43,-2,43,-23v0,-47,-88,-44,-88,3r-31,0v-1,-41,34,-67,77,-67xm68,-22v38,0,68,-26,59,-74v-43,8,-91,10,-94,44v-2,20,16,30,35,30","k":{"y":21,"w":17,"v":20,"t":12,"f":13}},"b":{"d":"89,-195v51,-1,88,47,88,99v0,53,-35,102,-87,102v-28,0,-47,-12,-59,-30r0,24r-31,0r0,-262r31,0r0,97v11,-18,31,-30,58,-30xm86,-22v35,0,58,-34,58,-71v0,-39,-22,-75,-59,-74v-35,0,-58,33,-57,71v0,38,22,74,58,74","w":203,"k":{"z":8,"y":13,"x":21,"w":8,"v":12,"t":14,"f":16}},"c":{"d":"93,-23v28,0,50,-19,54,-45r35,0v-5,43,-44,75,-90,75v-56,0,-92,-46,-92,-103v0,-81,86,-131,148,-82v16,13,27,29,31,50r-35,0v-3,-22,-26,-40,-51,-40v-38,0,-58,33,-58,72v0,39,21,74,58,73","w":200,"k":{"y":11,"x":18,"w":7,"v":11}},"d":{"d":"0,-95v0,-82,98,-142,146,-73r0,-94r31,0r0,262r-31,0r0,-24v-15,15,-33,30,-61,30v-49,0,-85,-51,-85,-101xm93,-22v37,0,58,-36,58,-75v0,-38,-22,-72,-57,-72v-36,0,-59,35,-59,74v0,38,22,73,58,73","w":206},"e":{"d":"0,-94v0,-91,112,-143,162,-69v15,21,23,47,23,78r-149,0v0,33,23,63,57,63v25,0,48,-19,52,-42r36,0v-8,39,-42,71,-88,71v-56,1,-93,-44,-93,-101xm149,-111v0,-47,-62,-78,-95,-40v-9,11,-16,24,-18,40r113,0","w":210,"k":{"z":9,"y":16,"x":22,"w":12,"v":16,"t":11,"f":12}},"f":{"d":"98,-235v-28,-12,-37,12,-34,44r34,0r0,26r-34,0r0,165r-33,0r0,-165r-31,0r0,-26r31,0v-3,-62,12,-79,67,-74r0,30","w":122,"k":{"q":8,"o":8,"g":8,"e":8,"d":13,"c":7}},"g":{"d":"86,-197v27,1,45,13,60,30r0,-24r32,0r0,182v4,73,-83,110,-144,75v-18,-10,-26,-26,-26,-44r32,0v9,35,76,45,94,6v7,-15,13,-31,13,-51v-13,16,-33,28,-60,29v-50,1,-87,-50,-87,-102v0,-52,37,-102,86,-101xm94,-22v35,0,58,-36,57,-73v0,-39,-22,-74,-58,-74v-37,0,-58,34,-58,73v-1,39,22,74,59,74","w":217,"k":{"i":7}},"h":{"d":"94,-197v41,0,66,31,65,75r0,122r-32,0v-6,-63,22,-166,-39,-170v-29,-2,-56,27,-56,57r0,113r-32,0r0,-262r32,0r0,98v8,-20,36,-33,62,-33","w":187},"i":{"d":"35,-226r-31,0r0,-36r31,0r0,36xm35,0r-31,0r0,-191r31,0r0,191","w":71},"j":{"d":"43,-226r-32,0r0,-36r32,0r0,36xm-20,42v22,1,31,-2,31,-25r0,-208r32,0r0,212v2,42,-20,53,-63,51r0,-30","w":90,"k":{"z":11,"y":11,"x":10,"w":9,"v":11,"t":11,"s":10,"q":14,"o":8,"l":16,"i":17,"g":8,"f":11,"e":8,"d":15,"c":9,"a":9}},"k":{"d":"159,-192r-71,71r70,121r-36,0r-57,-99r-34,34r0,65r-31,0r0,-262r31,0r0,158r87,-88r41,0","w":180,"k":{"s":9,"q":17,"o":17,"g":16,"e":16,"d":27,"c":16}},"l":{"d":"43,0r-32,0r0,-262r32,0r0,262","w":72},"m":{"d":"136,-166v27,-52,128,-37,128,33r0,133r-31,0v-5,-64,21,-171,-41,-171v-63,0,-38,106,-43,171r-33,0v-6,-63,23,-170,-40,-170v-64,0,-40,105,-44,170r-32,0r0,-192r30,0r0,26v16,-40,90,-40,106,0","w":292},"n":{"d":"93,-198v86,-1,64,114,66,198r-32,0v-6,-63,23,-166,-41,-170v-31,-2,-56,30,-56,61r0,109r-30,0r0,-192r30,0r0,29v10,-20,35,-35,63,-35","w":187},"o":{"d":"185,-95v0,57,-37,101,-92,101v-55,0,-93,-44,-93,-101v0,-58,37,-102,93,-102v55,0,92,46,92,102xm35,-96v0,38,23,74,58,74v37,0,58,-35,58,-74v0,-40,-21,-73,-58,-73v-35,-1,-58,35,-58,73","w":212,"k":{"z":10,"y":15,"x":23,"w":10,"v":14,"t":10,"f":10}},"p":{"d":"91,-197v51,-2,86,50,86,103v0,53,-34,102,-86,100v-25,0,-45,-10,-60,-29r0,95r-31,0r0,-264r31,0r0,28v13,-18,32,-33,60,-33xm86,-22v36,0,58,-36,58,-74v0,-38,-23,-73,-58,-73v-35,0,-58,36,-58,74v0,38,22,73,58,73","w":203,"k":{"z":7,"y":19,"x":20,"w":9,"v":13,"t":8,"f":8}},"q":{"d":"87,-197v28,0,47,14,59,32r0,-26r31,0r0,263r-31,0r0,-97v-9,19,-30,30,-56,31v-53,1,-90,-45,-90,-100v0,-53,36,-103,87,-103xm94,-22v37,0,57,-36,57,-75v0,-38,-22,-72,-58,-72v-35,0,-58,33,-58,71v0,40,21,76,59,76","w":227,"k":{"z":14,"y":14,"x":13,"w":12,"v":13,"u":8,"t":12,"s":13,"r":7,"q":17,"p":8,"o":11,"n":8,"m":8,"l":18,"k":7,"i":18,"h":7,"g":11,"f":13,"e":11,"d":11,"c":12,"b":8,"a":12}},"r":{"d":"92,-161v-38,-1,-60,16,-60,54r0,107r-32,0r0,-191r30,0r0,34v10,-26,28,-37,62,-38r0,34","w":111},"s":{"d":"37,-145v-10,26,94,42,89,43v68,32,14,108,-50,108v-44,0,-77,-26,-76,-68r31,0v0,26,21,40,47,40v22,1,50,-13,46,-32v-8,-46,-119,-23,-119,-87v0,-53,82,-72,123,-42v16,11,23,26,23,45r-31,0v3,-40,-80,-43,-83,-7","w":180,"k":{"y":8,"x":10,"v":8}},"t":{"d":"60,-48v-3,23,17,24,35,20r0,28v-36,5,-67,2,-67,-37r0,-128r-28,0r0,-26r28,0r0,-54r32,0r0,54r35,0r0,26r-35,0r0,117","w":118,"k":{"d":11}},"u":{"d":"71,-21v32,2,57,-34,57,-67r0,-103r32,0r0,191r-31,0r0,-28v-12,20,-36,34,-65,34v-40,1,-64,-31,-64,-73r0,-124r32,0v6,63,-22,165,39,170","w":189},"v":{"d":"175,-191r-70,191r-34,0r-71,-191r35,0r53,153r52,-153r35,0","w":197,"k":{"q":9,"o":9,"g":9,"e":9,"d":9,"c":8,"a":9}},"w":{"d":"262,-191r-59,191r-32,0r-41,-147r-40,147r-32,0r-58,-191r34,0r40,146r38,-146r37,0r38,146r41,-146r34,0","w":285,"k":{"a":8}},"x":{"d":"175,0r-39,0r-50,-74r-49,74r-37,0r67,-98r-64,-93r38,0r46,68r47,-68r37,0r-64,92","w":198,"k":{"s":10,"q":18,"o":18,"g":19,"e":18,"d":18,"c":18}},"y":{"d":"25,39v30,6,38,-3,46,-32r-71,-198r36,0r53,155r53,-155r35,0r-76,213v-11,33,-35,59,-76,47r0,-30","w":199,"k":{"q":18,"o":9,"g":13,"e":10,"d":10,"c":9,"a":10}},"z":{"d":"159,0r-159,0r0,-26r112,-137r-107,0r0,-28r149,0r0,26r-112,137r117,0r0,28","w":180},"{":{"d":"82,-37v-2,51,-7,85,43,84r0,27v-50,-2,-76,-13,-76,-62v0,-49,8,-99,-49,-93r0,-27v106,12,-12,-167,125,-155r0,26v-87,-11,-7,131,-79,142v25,9,37,24,36,58","w":149},"|":{"d":"116,-120r-27,0r0,-136r27,0r0,136xm116,63r-27,0r0,-136r27,0r0,136"},"}":{"d":"76,-201v0,48,-9,100,49,93r0,27v-108,-14,17,168,-125,155r0,-27v49,6,43,-40,43,-84v0,-35,10,-48,36,-58v-38,-9,-38,-52,-35,-98v2,-34,-12,-43,-44,-44r0,-26v50,2,76,13,76,62","w":149},"~":{"d":"154,-198v25,-2,36,-21,35,-50r27,0v0,44,-21,76,-62,76v-29,6,-68,-50,-92,-50v-25,0,-36,23,-35,50r-27,0v0,-44,21,-77,62,-76v29,-6,67,52,92,50","w":241},"\u00a0":{"w":97}}});


/*
---

name: Moderna.Bold

description: MgOpen Moderna Bold built with [Cufón](http://wiki.github.com/sorccu/cufon/about)

provides: Moderna.Bold

requires: ART.Font

...
*/

/*!
 * The following copyright notice may not be removed under any circumstances.
 * 
 * Copyright:
 * Copyright (c) Magenta ltd, 2004.
 * 
 * Manufacturer:
 * Magenta ltd
 * 
 * Vendor URL:
 * http://www.magenta.gr
 * 
 * License information:
 * http://www.ellak.gr/fonts/MgOpen/license.html
 */

ART.registerFont({"w":214,"face":{"font-family":"Moderna","font-weight":700,"font-stretch":"normal","units-per-em":"360","panose-1":"2 11 8 3 0 2 0 2 0 4","ascent":"288","descent":"-72","x-height":"6","bbox":"-12 -283 335 86","underline-thickness":"18","underline-position":"-27","unicode-range":"U+0020-U+007E"},"glyphs":{" ":{"w":97},"!":{"d":"14,-73v-7,-61,-17,-118,-14,-189r54,0v2,66,-3,125,-13,189r-27,0xm54,0r-53,0r0,-53r53,0r0,53","w":79},"\"":{"d":"93,-157r-35,0r0,-99r35,0r0,99xm34,-157r-34,0r0,-99r34,0r0,99","w":117},"#":{"d":"264,-187r-13,36r-50,0r-15,43r52,0r-13,36r-52,0r-26,73r-40,0r27,-73r-44,0r-26,73r-40,0r27,-73r-51,0r13,-36r51,0r15,-43r-53,0r13,-36r53,0r26,-74r39,0r-26,74r44,0r26,-74r39,0r-26,74r50,0xm163,-151r-45,0r-16,43r45,0","w":289},"$":{"d":"3,-181v0,-43,30,-75,77,-73r0,-23r22,0r0,23v47,0,72,30,75,75r-48,0v-2,-20,-10,-33,-27,-36r0,65v52,15,81,27,81,83v0,42,-36,74,-81,73r0,34r-22,0r0,-34v-52,-6,-79,-29,-80,-84r48,0v2,25,11,39,32,45r0,-74v-46,-5,-76,-27,-77,-74xm80,-215v-25,-3,-36,32,-22,49v4,4,12,8,22,11r0,-60xm102,-33v18,-3,29,-14,29,-34v0,-17,-10,-27,-29,-33r0,67","w":207},"%":{"d":"158,-59v-1,-38,27,-67,65,-67v37,0,65,29,65,67v0,38,-27,67,-65,67v-39,0,-65,-29,-65,-67xm196,-59v0,16,10,28,27,28v17,0,27,-14,28,-28v0,-16,-11,-27,-28,-27v-16,0,-27,13,-27,27xm234,-255r-152,262r-29,0r153,-262r28,0xm0,-189v0,-38,28,-66,65,-66v38,0,64,28,64,66v0,38,-27,67,-65,67v-37,0,-64,-29,-64,-67xm93,-189v0,-15,-11,-28,-28,-28v-17,0,-29,14,-29,29v1,15,12,27,28,27v17,0,29,-14,29,-28","w":314},"&":{"d":"165,-204v-1,33,-19,46,-44,64r38,47v7,-14,11,-29,13,-44r47,0v-4,29,-14,55,-31,79r48,58r-61,0r-18,-22v-29,23,-56,34,-81,34v-41,0,-76,-42,-76,-83v0,-39,25,-59,57,-76v-14,-18,-25,-29,-26,-52v-1,-37,30,-63,68,-63v37,0,67,24,66,58xm96,-171v21,-7,37,-52,3,-54v-32,2,-21,41,-3,54xm51,-74v0,40,57,52,79,19r-48,-59v-21,13,-31,27,-31,40","w":261},"'":{"d":"50,-262v4,51,-4,96,-50,100r0,-19v18,-5,26,-16,26,-34r-26,0r0,-47r50,0","w":74},"(":{"d":"101,-262v-63,85,-64,253,0,338r-38,0v-34,-47,-63,-100,-63,-169v0,-68,28,-122,63,-169r38,0","w":126},")":{"d":"38,-262v33,47,63,100,63,169v0,68,-28,122,-63,169r-38,0v27,-46,49,-102,49,-169v0,-68,-22,-120,-49,-169r38,0","w":126},"*":{"d":"185,-192r-51,13r35,43r-31,22r-31,-45r-31,45r-31,-22r35,-43r-50,-13r11,-36r48,16r0,-50r36,0r0,50r47,-16"},"+":{"d":"203,-91r-78,0r0,91r-36,0r0,-91r-78,0r0,-36r78,0r0,-91r36,0r0,91r78,0r0,36"},",":{"d":"53,-53v-1,36,6,73,-14,92v-10,11,-23,19,-39,23r0,-21v18,-8,29,-16,29,-41r-29,0r0,-53r53,0","w":78},"-":{"d":"107,-72r-100,0r0,-49r100,0r0,49","w":136},".":{"d":"53,0r-53,0r0,-54r53,0r0,54","w":78},"\/":{"d":"164,-270r-89,303r-24,0r88,-303r25,0"},"0":{"d":"202,-123v0,66,-34,129,-94,129v-61,0,-95,-63,-95,-129v0,-68,34,-132,95,-132v60,0,94,66,94,132xm108,-213v-54,11,-57,167,0,177v54,-10,54,-167,0,-177"},"1":{"d":"51,-210v45,0,63,-9,71,-45r41,0r0,255r-50,0r0,-175r-62,0r0,-35"},"2":{"d":"108,-256v47,0,90,34,90,79v0,77,-88,84,-118,133r115,0r0,44r-178,0v12,-73,24,-72,95,-125v23,-17,34,-33,34,-50v0,-22,-19,-38,-38,-38v-26,1,-39,22,-40,49r-47,0v-1,-54,35,-92,87,-92"},"3":{"d":"159,-135v22,11,38,29,40,60v4,72,-102,110,-155,62v-18,-16,-28,-37,-28,-65r49,0v-1,26,16,44,40,44v23,0,41,-16,41,-39v0,-29,-23,-40,-57,-39r0,-35v56,9,65,-68,14,-68v-21,0,-35,17,-34,41r-48,0v-1,-50,37,-82,86,-82v43,-1,85,28,83,70v-1,26,-14,38,-31,51"},"4":{"d":"201,-55r-30,0r0,55r-49,0r0,-55r-108,0r0,-45r94,-148r63,0r0,152r30,0r0,41xm123,-94r0,-110r-70,110r70,0"},"5":{"d":"71,-154v50,-40,128,13,128,71v0,75,-100,118,-158,72v-17,-14,-26,-33,-26,-57r51,0v-1,22,18,35,38,35v25,0,43,-20,43,-47v0,-41,-55,-62,-76,-29r-47,-2r17,-137r147,0r0,43r-111,0"},"6":{"d":"15,-118v0,-97,78,-175,155,-119v16,11,23,28,23,47r-52,0v-5,-27,-43,-34,-59,-9v-8,13,-14,28,-14,51v51,-42,135,-2,132,66v-2,51,-39,91,-91,90v-65,-1,-94,-55,-94,-126xm69,-81v0,25,17,48,42,48v24,0,39,-21,39,-45v0,-25,-18,-46,-42,-46v-24,0,-39,19,-39,43"},"7":{"d":"53,0v11,-94,38,-137,89,-204r-125,0r0,-44r181,0r0,38v-51,59,-80,117,-92,210r-53,0"},"8":{"d":"107,-256v70,0,119,88,55,122v21,11,37,31,37,60v1,46,-43,82,-91,82v-52,0,-93,-31,-93,-79v0,-31,15,-51,38,-63v-18,-12,-30,-27,-31,-52v0,-39,41,-70,85,-70xm71,-183v0,18,15,30,36,30v20,0,36,-12,36,-30v0,-19,-15,-32,-36,-32v-20,0,-36,13,-36,32xm68,-73v0,21,15,38,39,38v24,0,39,-14,39,-37v0,-22,-16,-42,-39,-41v-22,0,-40,16,-39,40"},"9":{"d":"106,-255v66,0,93,55,93,127v0,96,-73,173,-150,119v-16,-11,-24,-29,-27,-49r51,0v3,25,45,35,60,11v8,-13,13,-29,13,-53v-49,42,-131,3,-131,-67v0,-52,38,-88,91,-88xm67,-168v0,25,16,45,41,45v24,0,37,-17,37,-41v0,-26,-17,-50,-41,-50v-23,0,-38,23,-37,46"},":":{"d":"54,-137r-54,0r0,-53r54,0r0,53xm54,0r-54,0r0,-54r54,0r0,54","w":78},";":{"d":"54,-137r-54,0r0,-53r54,0r0,53xm54,-54v4,59,-2,107,-54,116r0,-21v21,-8,29,-16,30,-41r-30,0r0,-54r54,0","w":79},"<":{"d":"205,-5r-196,-86r0,-35r196,-87r0,39r-145,65r145,65r0,39"},"=":{"d":"207,-130r-199,0r0,-35r199,0r0,35xm207,-53r-199,0r0,-35r199,0r0,35"},">":{"d":"205,-91r-196,86r0,-39r145,-65r-145,-65r0,-39r196,87r0,35"},"?":{"d":"91,-270v67,0,115,74,70,124v-17,19,-49,36,-48,70r-48,0r0,-26v-5,-22,63,-64,58,-86v0,-21,-16,-38,-37,-37v-24,0,-35,20,-35,44r-51,0v-1,-52,40,-89,91,-89xm116,0r-53,0r0,-53r53,0r0,53","w":203},"@":{"d":"168,27v40,0,81,-15,107,-33r14,20v-30,23,-72,40,-121,41v-97,2,-167,-57,-168,-149v-1,-97,82,-170,181,-170v86,0,149,50,150,131v1,61,-42,114,-102,114v-29,0,-33,-5,-38,-29v-25,46,-118,35,-111,-32v-7,-67,83,-137,129,-77r9,-18r32,0r-28,113v0,9,9,14,17,14v37,0,60,-45,59,-84v0,-65,-46,-103,-113,-103v-85,0,-154,61,-154,141v0,73,59,123,137,121xm118,-84v0,37,34,50,56,27v17,-18,19,-46,26,-73v0,-13,-16,-24,-31,-24v-30,0,-51,39,-51,70","w":356},"A":{"d":"251,0r-57,0r-18,-54r-102,0r-17,54r-57,0r94,-262r62,0xm162,-98r-37,-112r-37,112r74,0","w":277,"k":{"y":54,"w":41,"v":54,"t":28,"s":12,"q":16,"o":17,"j":8,"g":17,"f":23,"e":17,"d":24,"c":17,"a":8,"Y":74,"W":62,"V":76,"U":17,"T":71,"S":22,"Q":28,"O":28,"J":26,"G":28,"C":28}},"B":{"d":"207,-195v0,26,-13,45,-32,53v22,8,41,34,41,63v0,49,-44,79,-96,79r-120,0r0,-262v88,2,207,-21,207,67xm153,-189v0,-38,-62,-27,-102,-28r0,56v41,-2,102,11,102,-28xm160,-81v0,-44,-63,-34,-109,-35r0,69v45,-1,109,10,109,-34","w":243,"k":{"Y":27,"X":23,"W":17,"V":20,"T":12,"A":16}},"C":{"d":"128,-40v35,-1,57,-22,67,-50r57,0v-10,57,-60,98,-125,98v-74,1,-127,-63,-127,-139v0,-111,120,-179,208,-113v23,17,37,40,42,68r-57,0v-8,-26,-32,-46,-64,-46v-46,-1,-74,42,-74,90v0,48,27,93,73,92","w":270,"k":{"z":10,"y":8,"x":10,"v":8,"Z":15,"Y":36,"X":36,"W":21,"V":26,"T":20,"J":9,"A":27}},"D":{"d":"224,-136v0,79,-57,136,-136,136r-88,0r0,-262r104,0v71,-2,120,56,120,126xm170,-131v0,-44,-26,-87,-67,-86r-50,0r0,170v72,8,117,-18,117,-84","w":250,"k":{"x":8,"Z":22,"Y":38,"X":40,"W":22,"V":27,"T":23,"J":10,"A":31}},"E":{"d":"197,0r-197,0r0,-262r190,0r0,45r-137,0r0,56r126,0r0,45r-126,0r0,68r144,0r0,48","w":213,"k":{"y":22,"w":18,"v":22,"t":10,"f":9,"T":8,"Q":9,"O":9,"J":8,"G":8,"C":9}},"F":{"d":"183,-217r-130,0r0,60r114,0r0,45r-114,0r0,112r-53,0r0,-262r183,0r0,45","w":201,"k":{"z":22,"y":28,"x":39,"w":25,"v":28,"u":12,"t":21,"s":21,"r":12,"q":14,"p":12,"o":15,"n":12,"m":12,"g":15,"f":23,"e":15,"d":17,"c":15,"a":21,"T":8,"S":9,"Q":12,"O":12,"J":101,"G":12,"C":12,"A":48}},"G":{"d":"55,-131v0,67,65,119,118,75v12,-11,20,-25,24,-41r-55,0r0,-45r110,0r0,142r-37,0r-6,-31v-23,25,-52,39,-85,39v-74,1,-124,-64,-124,-140v0,-109,116,-177,205,-114v23,16,37,37,44,65r-58,0v-8,-22,-32,-41,-61,-41v-47,0,-75,44,-75,91","w":273,"k":{"Y":31,"W":16,"V":21,"T":15}},"H":{"d":"217,0r-54,0r0,-117r-109,0r0,117r-54,0r0,-262r54,0r0,97r109,0r0,-97r54,0r0,262","w":246},"I":{"d":"65,0r-54,0r0,-262r54,0r0,262","w":94},"J":{"d":"83,-37v24,-1,31,-17,31,-43r0,-182r54,0r0,186v-1,59,-24,84,-83,84v-66,0,-85,-34,-85,-105r52,0v-3,31,1,62,31,60","w":196,"k":{"A":12}},"K":{"d":"233,0r-65,0r-86,-120r-28,28r0,92r-54,0r0,-262r54,0r0,108r103,-108r67,0r-104,106","w":258,"k":{"y":58,"w":45,"v":58,"u":15,"t":32,"s":24,"q":28,"o":32,"j":8,"g":31,"f":23,"e":31,"d":32,"c":32,"a":17,"Y":15,"W":11,"V":13,"T":16,"S":33,"Q":43,"O":44,"J":33,"G":43,"C":44}},"L":{"d":"183,0r-183,0r0,-262r54,0r0,214r129,0r0,48","w":197,"k":{"y":42,"w":32,"v":42,"t":21,"j":8,"f":23,"d":11,"Y":74,"W":52,"V":63,"T":71,"S":9,"Q":17,"O":18,"J":14,"G":17,"C":18}},"M":{"d":"264,0r-51,0r0,-212r-53,212r-56,0r-54,-212r0,212r-50,0r0,-262r80,0r52,199r52,-199r80,0r0,262","w":294},"N":{"d":"216,0r-56,0r-107,-180r0,180r-53,0r0,-262r56,0r107,180r0,-180r53,0r0,262","w":245},"O":{"d":"258,-131v0,78,-53,139,-129,139v-76,0,-129,-62,-129,-139v0,-78,53,-139,129,-139v76,0,129,62,129,139xm55,-131v0,48,28,91,74,91v45,0,73,-43,73,-91v0,-48,-28,-91,-73,-91v-48,0,-74,43,-74,91","w":283,"k":{"Z":17,"Y":37,"X":37,"W":21,"V":26,"T":21,"J":8,"A":27}},"P":{"d":"200,-177v0,46,-31,83,-79,83r-67,0r0,94r-54,0r0,-262r117,0v49,-1,83,36,83,85xm148,-177v0,-43,-48,-42,-94,-40r0,76v43,0,94,7,94,-36","w":217,"k":{"d":8,"Y":24,"X":24,"W":12,"V":16,"T":8,"J":39,"A":43}},"Q":{"d":"129,-270v113,0,166,148,100,230r29,28r-29,30r-32,-29v-87,54,-197,-15,-197,-120v0,-78,53,-139,129,-139xm54,-130v0,59,45,107,105,83r-27,-28r29,-30r28,28v30,-52,7,-145,-58,-145v-47,0,-77,44,-77,92","w":284,"k":{"Y":36,"W":20,"V":25,"T":21}},"R":{"d":"206,-60v1,21,-2,44,11,52r0,8r-59,0v-20,-30,13,-111,-47,-102r-57,0r0,102r-54,0r0,-262r127,0v48,-2,85,26,85,72v0,30,-16,56,-40,64v27,10,34,27,34,66xm159,-183v0,-46,-61,-32,-105,-34r0,69v45,-1,104,9,105,-35","w":245,"k":{"d":10,"Y":26,"W":15,"V":19,"T":10,"J":16}},"S":{"d":"153,-185v0,-46,-92,-55,-96,-8v-11,35,119,47,116,52v27,12,41,32,41,61v0,83,-117,112,-178,65v-21,-17,-34,-39,-36,-67r54,0v0,49,103,60,108,9v11,-35,-118,-49,-116,-53v-27,-12,-41,-32,-41,-60v0,-79,113,-107,169,-62v21,16,31,37,31,63r-52,0","w":237,"k":{"Y":30,"X":22,"W":18,"V":22,"T":14,"A":15}},"T":{"d":"210,-215r-78,0r0,215r-55,0r0,-215r-77,0r0,-47r210,0r0,47","w":231,"k":{"z":36,"y":32,"x":33,"w":30,"v":31,"u":25,"t":18,"s":45,"r":25,"q":44,"p":25,"o":45,"n":25,"m":25,"g":45,"f":20,"e":46,"d":48,"c":46,"a":45,"T":8,"S":9,"Q":18,"O":18,"J":72,"G":17,"C":18,"A":66}},"U":{"d":"106,-40v32,0,51,-26,50,-60r0,-162r55,0r0,168v1,59,-47,102,-106,102v-59,0,-105,-43,-105,-102r0,-168r54,0r0,162v-1,34,21,60,52,60","w":240,"k":{"A":20}},"V":{"d":"232,-262r-89,262r-53,0r-90,-262r60,0r56,196r57,-196r59,0","w":258,"k":{"z":27,"y":22,"x":24,"w":21,"v":22,"u":16,"t":18,"s":37,"r":16,"q":37,"p":16,"o":39,"n":16,"m":15,"g":38,"f":18,"e":40,"d":41,"c":39,"a":37,"T":8,"S":21,"Q":26,"O":26,"J":54,"G":26,"C":26,"A":75}},"W":{"d":"335,-262r-75,262r-52,0r-41,-201r-40,201r-52,0r-75,-262r56,0r45,185r38,-185r57,0r38,185r45,-185r56,0","w":362,"k":{"z":23,"y":19,"x":21,"w":17,"v":19,"u":13,"t":15,"s":32,"r":12,"q":32,"p":12,"o":33,"n":12,"m":12,"g":32,"f":15,"e":34,"d":36,"c":33,"a":32,"T":8,"S":19,"Q":23,"O":23,"J":47,"G":22,"C":23,"A":63}},"X":{"d":"232,0r-62,0r-54,-91r-54,91r-62,0r82,-134r-82,-128r62,0r54,91r53,-91r63,0r-82,127","w":258,"k":{"y":37,"w":36,"v":37,"u":13,"t":28,"s":21,"q":25,"o":28,"g":28,"f":22,"e":28,"d":29,"c":28,"a":14,"T":8,"S":29,"Q":39,"O":39,"J":30,"G":38,"C":39}},"Y":{"d":"217,-262r-79,164r0,98r-54,0r0,-98r-84,-164r54,0r57,113r51,-113r55,0","w":241,"k":{"z":34,"y":30,"x":31,"w":28,"v":30,"u":23,"t":25,"s":48,"r":23,"q":49,"p":23,"o":52,"n":23,"m":23,"g":50,"f":25,"e":53,"d":53,"c":52,"a":48,"T":8,"S":25,"Q":33,"O":33,"J":72,"G":33,"C":33,"A":67}},"Z":{"d":"208,-217r-143,170r141,0r0,47r-206,0r0,-46r143,-169r-140,0r0,-47r205,0r0,45","w":234,"k":{"y":18,"w":17,"v":18,"t":14,"q":9,"o":11,"g":10,"f":14,"e":10,"d":12,"c":11,"T":8,"S":9,"Q":17,"O":17,"J":15,"G":16,"C":17}},"[":{"d":"90,78r-90,0r0,-340r90,0r0,38r-41,0r0,264r41,0r0,38","w":115},"\\":{"d":"113,33r-24,0r-89,-303r24,0","w":137},"]":{"d":"90,78r-90,0r0,-38r42,0r0,-264r-42,0r0,-38r90,0r0,340","w":115},"^":{"d":"163,-217r-24,0r-32,-39r-31,39r-25,0r35,-66r42,0"},"_":{"d":"199,86r-183,0r0,-37r183,0r0,37"},"`":{"d":"49,-170r-49,0v-4,-50,3,-96,49,-100r0,19v-18,6,-25,12,-26,34r26,0r0,47","w":74},"a":{"d":"170,-36v-2,17,11,21,11,36r-54,0v-3,-8,-5,-16,-6,-24v-24,47,-127,39,-121,-29v4,-51,28,-58,89,-64v21,-3,31,-9,31,-18v-3,-32,-67,-31,-64,5r-49,0v0,-44,32,-71,78,-71v40,0,85,22,85,57r0,108xm77,-33v31,0,49,-25,44,-62v-32,9,-71,12,-71,39v0,14,12,23,27,23","w":203,"k":{"y":9,"v":8}},"b":{"d":"187,-97v0,53,-29,104,-79,103v-28,0,-46,-14,-58,-32r0,26r-50,0r0,-262r50,0r0,92v11,-18,31,-30,58,-31v50,-1,79,51,79,104xm136,-97v0,-30,-15,-59,-42,-59v-28,-1,-44,30,-44,60v0,29,16,58,43,58v27,0,43,-29,43,-59","w":213,"k":{"y":12,"x":18,"v":10}},"c":{"d":"98,-36v22,-1,38,-18,43,-37r54,0v-8,44,-44,79,-95,79v-57,0,-100,-43,-100,-101v0,-85,94,-137,160,-86v17,13,29,31,35,55r-56,0v-20,-60,-86,-25,-86,28v0,32,16,62,45,62","k":{"y":11,"x":20,"v":10}},"d":{"d":"79,-201v27,1,47,13,58,31r0,-92r50,0r0,262r-49,0r0,-26v-14,22,-34,32,-59,32v-51,1,-79,-50,-79,-103v0,-53,28,-105,79,-104xm137,-96v0,-30,-16,-60,-43,-60v-27,0,-43,29,-43,59v0,30,15,60,42,60v27,0,44,-29,44,-59","w":216},"e":{"d":"0,-96v0,-65,32,-110,93,-110v68,0,91,48,91,123r-130,0v-5,46,58,65,75,24r52,0v-10,37,-41,66,-87,66v-56,0,-94,-45,-94,-103xm130,-117v5,-39,-42,-54,-66,-31v-7,7,-10,18,-10,31r76,0","w":209,"k":{"y":14,"x":17,"w":9,"v":13}},"f":{"d":"111,-222v-23,-1,-38,0,-33,28r33,0r0,36r-33,0r0,158r-50,0r0,-158r-28,0r0,-36r28,0v-4,-62,25,-74,83,-69r0,41","w":136},"g":{"d":"0,-98v0,-54,31,-104,82,-103v24,0,43,11,56,31r0,-24r50,0r0,181v-1,67,-27,91,-95,92v-47,1,-83,-20,-87,-60r57,0v4,13,16,18,32,18v39,1,43,-23,42,-64v-11,17,-28,26,-54,27v-51,1,-83,-45,-83,-98xm52,-100v0,29,16,57,43,57v26,0,42,-27,42,-56v1,-29,-16,-57,-43,-57v-27,0,-42,27,-42,56","w":217},"h":{"d":"111,-200v83,1,61,117,63,200r-52,0r0,-101v0,-28,-7,-56,-30,-56v-59,0,-36,96,-40,157r-52,0r0,-262r52,0r0,90v14,-16,33,-28,59,-28","w":202},"i":{"d":"55,-215r-51,0r0,-47r51,0r0,47xm55,0r-51,0r0,-194r51,0r0,194","w":84},"j":{"d":"63,-215r-52,0r0,-47r52,0r0,47xm-12,36v14,0,23,-1,23,-14r0,-216r52,0r0,225v1,42,-33,52,-75,48r0,-43","w":93},"k":{"d":"179,0r-62,0r-47,-82r-19,20r0,62r-51,0r0,-262r51,0r0,137r61,-69r63,0r-68,72","w":199,"k":{"s":9,"q":13,"o":16,"g":15,"e":15,"d":23,"c":16}},"l":{"d":"62,0r-51,0r0,-262r51,0r0,262","w":93},"m":{"d":"157,-171v26,-51,119,-30,119,35r0,136r-51,0r0,-125v0,-15,-12,-30,-28,-29v-58,3,-26,99,-34,154r-51,0r0,-125v0,-17,-10,-30,-28,-29v-56,5,-26,99,-33,154r-51,0r0,-194r49,0r0,22v20,-37,88,-36,108,1","w":304},"n":{"d":"108,-201v40,-1,67,30,66,69r0,132r-52,0r0,-117v1,-22,-11,-40,-31,-39v-59,4,-34,97,-39,156r-52,0r0,-194r50,0r0,23v11,-17,32,-30,58,-30","w":202},"o":{"d":"198,-96v0,59,-40,102,-99,102v-58,0,-99,-43,-99,-102v0,-59,40,-105,99,-105v59,0,99,46,99,105xm53,-97v0,31,16,60,45,60v30,1,46,-28,46,-60v0,-32,-16,-60,-46,-60v-30,0,-45,29,-45,60","w":225,"k":{"y":15,"x":23,"w":10,"v":14}},"p":{"d":"187,-98v0,53,-29,105,-79,104v-27,0,-47,-12,-58,-30r0,101r-50,0r0,-271r50,0r0,26v12,-18,31,-33,58,-33v50,0,79,50,79,103xm136,-96v0,-30,-14,-60,-42,-60v-29,0,-44,28,-44,58v0,30,16,61,44,60v26,0,42,-29,42,-58","w":213,"k":{"y":18,"x":18,"v":11}},"q":{"d":"79,-201v26,1,46,15,59,31r0,-24r49,0r0,271r-50,0r0,-102v-14,21,-34,31,-58,31v-49,1,-79,-49,-79,-102v0,-53,29,-107,79,-105xm138,-96v0,-29,-17,-60,-44,-60v-28,0,-43,29,-43,58v-1,30,16,61,42,61v27,0,45,-29,45,-59","w":216},"r":{"d":"112,-146v-39,0,-59,7,-60,43r0,103r-52,0r0,-194r48,0r0,34v13,-24,29,-39,64,-39r0,53","w":132},"s":{"d":"85,-161v-39,3,-35,28,3,38v60,15,84,17,88,64v6,63,-101,86,-148,49v-18,-13,-28,-30,-28,-53r52,0v-3,33,68,42,73,10v2,-21,-85,-32,-88,-37v-20,-10,-31,-26,-31,-48v-2,-60,94,-84,138,-46v15,12,24,28,27,49r-51,0v-1,-17,-17,-28,-35,-26","w":200,"k":{"y":11,"x":11,"v":10}},"t":{"d":"77,-50v0,14,15,13,30,13r0,38v-48,6,-82,0,-82,-54r0,-105r-25,0r0,-36r25,0r0,-53r52,0r0,53r30,0r0,36r-30,0r0,108","w":132},"u":{"d":"82,-38v61,0,35,-96,40,-156r51,0r0,194r-50,0r0,-23v-14,16,-36,28,-63,28v-84,0,-55,-118,-60,-199r51,0v7,55,-23,156,31,156","w":202},"v":{"d":"192,-194r-69,194r-54,0r-69,-194r58,0r39,139r40,-139r55,0","k":{"q":8,"o":9,"g":8,"e":10,"d":8,"c":9,"a":8}},"w":{"d":"274,-194r-54,194r-52,0r-31,-139r-30,139r-52,0r-55,-194r53,0r31,135r27,-135r53,0r28,135r32,-135r50,0","w":298},"x":{"d":"192,0r-61,0r-36,-62r-35,62r-60,0r66,-99r-63,-95r59,0r34,59r34,-59r58,0r-61,94","k":{"s":10,"q":14,"o":18,"g":17,"e":17,"d":14,"c":18}},"y":{"d":"31,28v21,5,41,0,39,-24v-15,-51,-50,-143,-70,-198r57,0r41,140r39,-140r55,0r-77,222v-8,37,-40,49,-84,42r0,-42","k":{"s":7,"q":16,"o":10,"g":12,"e":10,"d":8,"c":10,"a":8}},"z":{"d":"172,0r-172,0r0,-40r107,-113r-101,0r0,-41r162,0r0,42r-104,109r108,0r0,43","w":195},"{":{"d":"54,-95v73,4,-4,140,76,131r0,38v-75,5,-88,-37,-82,-107v3,-33,-15,-41,-48,-43r0,-37v80,10,25,-96,60,-132v12,-13,36,-18,70,-18r0,37v-48,-9,-41,44,-39,78v2,32,-12,44,-37,53","w":155},"|":{"d":"37,-120r-37,0r0,-135r37,0r0,135xm37,63r-37,0r0,-136r37,0r0,136","w":62},"}":{"d":"85,-202v0,49,-12,93,45,89r0,37v-80,-10,-23,95,-59,131v-12,13,-37,19,-71,19r0,-38v46,4,38,-38,38,-77v0,-32,12,-45,38,-54v-40,-7,-39,-50,-36,-95v2,-27,-12,-36,-40,-36r0,-37v56,2,85,10,85,61","w":154},"~":{"d":"155,-205v23,0,30,-20,30,-46r36,0v0,47,-21,80,-65,81v-27,6,-69,-45,-89,-45v-24,0,-31,20,-31,45r-36,0v-1,-46,22,-81,65,-81v26,-5,70,47,90,46","w":245},"\u00a0":{"w":97}}});

