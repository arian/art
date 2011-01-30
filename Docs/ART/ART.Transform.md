ART.Transform {#ART-Transform}
==============================

ART.Transform lets you manipulate ART objects by moving, scaling and rotating them.

You can also use a custom [homogeneous transformation matrix][] to create advanced transforms.

[ART.Shape][] implements ART.Transform as a mixin which means it has all ART.Transform methods
available.

This documentation refers to the "origin". This refers to the 0,0 coordinate in a shape
or group. Often the top left corner.

ART.Transform method: constructor
---------------------------------

Typically you won't use this constructor yourself. Instead, you'll use the methods as they're
implemented on shapes or groups.

### Syntax:

	var transform = new ART.Transform([xx, yx, xy, yy[, x, y]]);

### Arguments:

1. xx - (*number*) multiplier to scale the x axis (default: 1)
2. yx - (*number*) multiplier to skew the x axis (default: 0)
3. xy - (*number*) multiplier to skew the y axis (default: 0)
4. yy - (*number*) multiplier to scale y scale (default: 1)
5. x - (*number*) number of units to move in the horizontal direction (default: 0)
6. y - (*number*) number of units to move in the vertical direction (default: 0)

The arguments correspond to the following [homogeneous transformation matrix][]:

	xx  xy  x
	yx  yy  y
	0   0   1

The default transformation is the [identity matrix]:

	1 0 0
	0 1 0
	0 0 1

### Alternative Syntax:

	var transform = new ART.Transform(transform);

### Arguments:

1. transform - (*ART.Transform*) an existing transform to clone.


ART.Transform method: transform {#ART-Transform:transform}
----------------------------------------------------------

Modifies the current transform by multiplying the current values with some new values.
This method can be used to create complex transformations. Typically you won't use this method
yourself but rather one of the other convenient methods.

Note: The order of which multiplied transforms are applied is significant.

### Syntax:

	instance.transform(xx, yx, xy, yy[, x, y]);

### Arguments:

1. xx - (*number*) multiplier to scale the x axis (default: 1)
2. yx - (*number*) multiplier to skew the x axis (default: 0)
3. xy - (*number*) multiplier to skew the y axis (default: 0)
4. yy - (*number*) multiplier to scale y scale (default: 1)
5. x - (*number*) number of units to move in the horizontal direction (default: 0)
6. y - (*number*) number of units to move in the vertical direction (default: 0)

The arguments correspond to the following [matrix multiplication][]:

	  result       current      arguments
	xx  xy  x     xx  xy  x     xx  xy  x
	yx  yy  y  =  yx  yy  y  *  yx  yy  y
	0   0   1     0   0   1     0   0   1

### Alternative Syntax:

	instance.transform(transform);

### Arguments:

1. transform - (*ART.Transform*) an existing transform object.

### Returns:

* The current ART.Transform instance or shape


ART.Transform method: transformTo {#ART-Transform:transformTo}
--------------------------------------------------------------

Resets the transform to some new values. This method has the same arguments as the constructor.

This is typically used to reset the transform of a shape to some absolute value.

### Syntax:

	instance.transformTo([xx, yx, xy, yy[, x, y]]);
	instance.transformTo([transform]);


ART.Transform method: move {#ART-Transform:move}
------------------------------------------------

Moves the origin x/y units in the horizontal/vertical direction.

### Syntax:

	transform.move(x, y);

### Arguments:

1. x - (*number*) The number of units to move in the horizontal direction.
2. y - (*number*) The number of units to move in the vertical direction.

### Returns:

* The current ART.Transform instance or shape


ART.Transform method: moveTo {#ART-Transform:moveTo}
----------------------------------------------------

Moves the origin to an absolute point.

### Syntax:

	transform.moveTo(x, y);

### Arguments:

1. x - (*number*) The position within it's parent along the horizontal axis.
2. y - (*number*) The position within it's parent along the vertical axis.

### Returns:

* The current ART.Transform instance or shape


ART.Transform method: scale {#ART-Transform:scale}
----------------------------------------------------

Scales the size of an ART object relative to the current size.

### Syntax:

	transform.scale(x, y);

### Arguments:

1. x - (*number*) Scaling along the horizontal axis
2. y - (*number*) Scaling along the vertical axis.

### Returns:

* The current ART.Transform instance or shape

### Examples:

	// The scaled rectangle will be 100px wide and 150px high
	new ART.Rectangle(50, 50).scale(2, 3);


ART.Transform method: scaleTo {#ART-Transform:scaleTo}
------------------------------------------------------

Scales the size of an ART object relative to the original size.

### Syntax:

	transform.scaleTo(x, y);

### Arguments:

1. x - (*number*) Scaling along the horizontal axis
2. y - (*number*) Scaling along the vertical axis.

### Returns:

* The current ART.Transform instance or shape


ART.Transform method: rotate {#ART-Transform:rotate}
----------------------------------------------------

Rotates an ART object relative to the current rotation.

### Syntax:

	transform.rotate(deg[, x, y]);

### Arguments:

1. deg - (*number*) The number of degrees of rotation
2. x - (*number*, optional) The x-point that will be rotated about, relative to the obect's origin.
3. y - (*number*, optional) The y-point that will be rotated about, relative to the obect's origin.

### Returns:

* The current ART.Transform instance or shape

### Examples:

	var rect = new ART.Rectangle(100, 50);
	rect.rotate(45); // rotates the rectangle 45 degrees

	var rect = new ART.Rectangle(100, 50);
	rect.rotate(45, 50, 25); // rotates the rectangle 45 degrees about the middlepoint of the rectangle


ART.Transform method: rotateTo {#ART-Transform:rotateTo}
--------------------------------------------------------

Rotates an ART object relative to the original rotation.

### Syntax:

	transform.rotateTo(deg[, x, y]);

### Arguments:

1. deg - (*number*) The number of degrees of rotation
2. x - (*number*, optional) The x-point that will be rotated about, relative to the obect's origin.
3. y - (*number*, optional) The y-point that will be rotated about, relative to the obect's origin.

### Returns:

* The current ART.Transform instance or shape


ART.Transform method: resizeTo {#ART-Transform:resizeTo}
--------------------------------------------------------

Resize an ART object.

### Syntax:

	transform.resizeTo(x, y);

### Arguments:

1. x - (*number*) The new width in pixels
2. y - (*number*) The new height in pixels

### Returns:

* The current ART.Transform instance or shape

### Example:

	var rect = new ART.Rectangle(300, 200);
	rect.resize(500, 100);


ART.Transform method: point {#ART-Transform:point}
--------------------------------------------------

// Write me


[ART.Shape]: ART.Shape
[homogeneous transformation matrix]:  http://en.wikipedia.org/wiki/Transformation_matrix
[identity matrix]: http://en.wikipedia.org/wiki/Identity_matrix
[matrix multiplication]: http://en.wikipedia.org/wiki/Matrix_multiplication
