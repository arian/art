ART.Text {#ART-Text}
====================

ART.Text creates a shape based on text content using native text rendering.

ART.Text doesn't directly inherit from [ART.Shape][] but implements the same methods.


ART.Text method: constructor
----------------------------

### Syntax:

	var text = new ART.Text(text[, font, alignment, path]);

### Arguments:

1. text - (*string*) The text you would like to display
2. font - (*string*, *object*, optional) The font that will be used. It can be a CSS font decleration or an object with the declarations, see examples
3. alignment - (*string*, optional) The allignment of the text, possible values are 'left', 'right' or 'center'.
4. path - (*ART.Path*, optional) An [ART.Path][] instance to draw the text on a certain path.

### Examples:

	var art = new ART(500, 500);
	var text = new ART.Text('some text').fill('black').inject(art);

	// Uses a CSS Font declaration to specify a font
	var text = new ART.Text('some text', '12px/14px sans-serif');

	// Uses an object to specify the font
	var text = new ART.Text('some text', {
		'font-family': 'sans-serif',
		'font-size': '20px',
		'font-weight: 'bold',
		'font-style': 'italic'
	});

	// Draw the text on a path
	var path = new ART.Path();
	// Create a circle
	path.move(0, 50).arc(100, 0, 50, 50).arc(-100, 0, 50, 50).close();
	var text = new ART.Text('some text', '12px sans-serif', 'left', path);

### Note:

- ART.Text doesn't support custom @font-face files when [VML] rendering is used.
You may use [ART.Font][] instead.


[ART.Shape]: ../ART/ART.Shape
[ART.Font]: ART.Font
[VML]: ../Modes/ART.VML
[ART.Path]: ../ART/ART.Path
