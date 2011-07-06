ART.Element {#ART-Element}
==========================


ART.Element method: blend {#ART-Element:blend}
----------------------------------------------

Changes the opacity of an element

### Syntax:

	myElement.blend(opacity);

### Arguments:

1. opacity - (*number*) The required opacity


ART.Element method: fill {#ART-Element:fill}
----------------------------------------------

Fills up the element with an color

### Syntax:

	myElement.fill(color);

### Arguments:

1. color - (*string*) A CSS color name or a CSS hex color


ART.Element method: stroke {#ART-Element:stroke}
------------------------------------------------

Gives the element a stroke

### Syntax:

	myElement.stroke(color[, width, cap, join]);

### Arguments:

1. color - (*string*) A CSS color name or a CSS hex color
2. width - (*number*, defaults to `1`) Stroke with in pixels
3. cap - (*string*, defaults to `round`) specifies the shape to be used at the end of open subpaths when they are stroked
4. join - (*strnig*, defaults to `round`) specifies the shape to be used at the corners of paths or basic shapes when they are stroked.



ART.Element method: hide {#ART-Element:hide}
--------------------------------------------

Hides an element

### Syntax:

	myElement.hide();



ART.Element method: show {#ART-Element:show}
--------------------------------------------

Shows an element again, after it was hidden.

### Syntax:

	myElement.show();



ART.Element method: indicate {#ART-Element:indicate}
----------------------------------------------------

Set the cursor style and element title

### Syntax:

	myElement.indicate([cursor, tooltip]);

### Arguments:

1. cursor (*string*) A [CSS Cursor][] type
2. tooltip (*string*) A tooltip text for as title

[CSS Cursor]: https://developer.mozilla.org/en/CSS/cursor
[ART]: ../ART/ART
[ART.Transform]: ../ART/ART.Transform
[ART.Shape]: ../ART/ART.Shape