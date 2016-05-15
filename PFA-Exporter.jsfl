/**
* @desc         Phaser Flash Assert Exporter
* @version      1.0 - May 28th 2014
* @author       Mário Silva <mmcs@outlook.pt>
* @copyright    2016 mmcs85
* @license      {@link https://github.com/mmcs85/PFA-Exporter/blob/master/LICENSE|MIT License}
*/

var document = fl.getDocumentDOM();
var libItems = document.library.items;
var sse = new SpriteSheetExporter;
var exportedItems = [];

/* Spritesheet Exporter Utils */

var addSpriteSheetExportLibraryItem = function(item) {
	if(exportedItems.indexOf(item.name) != -1)
		return;
	
	switch(item.itemType) {		
		case "bitmap":
			sse.addBitmap(item);
		    exportedItems.push(item.name);
			break;
		case "graphic":
			sse.addSymbol(item);
			exportedItems.push(item.name);			
			break;
		case "movie clip":
			scanMovieClipForSpriteSheetItems(item);
			exportedItems.push(item.name);
			break;		
	}
}

var scanMovieClipForSpriteSheetItems = function(mc) {
	var timeline = mc.timeline;
	for(var l = 0; l < timeline.layers.length; l++) {
		var layer = timeline.layers[l];
		for(var f = 0; f < layer.frames.length; f++) {
			var frame = layer.frames[f];
			for(var e = 0; e < frame.elements.length; e++) {
				var element = frame.elements[e];
				if(element.elementType == 'instance') {
					addSpriteSheetExportLibraryItem(element.libraryItem);
				}
			}
		}
	}
}

/* Generator Utils */

var generateLibraryItem = function(fileName, item) {
	if(exportedItems.indexOf(item.name) != -1)
		return "";

	switch(item.itemType) {		
		case "bitmap":
		case "graphic":
			exportedItems.push(item.name);
			var symbolName = item.name.substr(item.name.lastIndexOf("/")+1, item.name.length);
			var out = "lib." + symbolName.replace("\.", "") + " = function(game, x, y){\n";			
			out = out.concat("    return game.make.sprite(x, y, '").concat(fileName).concat("', '").concat(symbolName).concat("');\n")
				.concat("}\n\n");
			sse.addBitmap(item);		    
			return out;
		case "movie clip":
			exportedItems.push(item.name);
			return generateMovieClip(fileName, item);	
	}
	
	return "";
}

var generateMovieClip = function(fileName, mc) {	
	var timeline = mc.timeline;
	
	// generate movieclip instances first
	for(var l = 0; l < timeline.layers.length; l++) {
		var layer = timeline.layers[l];
		for(var f = 0; f < layer.frames.length; f++) {
			var frame = layer.frames[f];
			for(var e = 0; e < frame.elements.length; e++) {
				var element = frame.elements[e];
				if(element.elementType == 'instance') {
					generateLibraryItem(fileName, element.libraryItem);
				}
			}
		}
	}
	
	// generate movieclip
	var instanceCount = 1;
	var symbolName = mc.name.substr(mc.name.lastIndexOf("/")+1, mc.name.length);
	var groupOut = "";
	var first = true;
	var out = "lib." + symbolName.replace("\.", "") + " = function(game, x, y){\n";

	out = out.concat("    var group = game.make.group();\n")
		.concat("    group.x = x;\n")
		.concat("    group.y = y;\n");
	
	for(var l = 0; l < timeline.layers.length; l++) {
		var layer = timeline.layers[l];
		for(var f = 0; f < layer.frames.length && f < 1; f++) {
			var frame = layer.frames[f];
			for(var e = 0; e < frame.elements.length; e++) {
				var element = frame.elements[e];
				if(element.elementType == 'instance') {
					var symbolName = element.libraryItem.name.substr(element.libraryItem.name.lastIndexOf("/")+1, element.libraryItem.name.length).replace("\.", "");
					var instanceName = element.name || ("instance"+instanceCount++);
					
					if(first) {
						groupOut = groupOut.concat(instanceName);
						first = false;
					}
					else {
						groupOut = groupOut.concat(",").concat(instanceName);
					}

					out = out.concat("    var ")
						.concat(instanceName)
						.concat(" = lib.").concat(symbolName).concat("(game,").concat(element.x).concat(",").concat(element.y).concat(");\n")
				}
			}
		}
	}
	
	
	out = out.concat("    group.addMutiple([").concat(groupOut).concat("]);\n")
		.concat("    return group;\n")
	.concat("}\n\n");
	return out;
}

var generateSymbols = function(fileName) {
	var out = "";
	exportedItems.length = 0;
	for (var i = 0; i < libItems.length; i++)
	{
		var item = libItems[i];
		
		// ignore items without linkage unless is referenced as instance in other item
		if(!item.linkageClassName)
			continue;
		
		out = out.concat(generateLibraryItem(fileName, item));		
	}
	return out;
};

var generateAssetsFile = function(fileName) {
	var out = "// Generated by PFA Exporter v0.2 at " + new Date().toUTCString() + "\n\n";
	
	out = out.concat("(function (lib) {	\n\n")
		.concat("// library properties:\n")
		.concat("lib.properties = {\n")
		.concat("	width:").concat(document.width).concat(",\n")
		.concat("	height:").concat(document.height).concat(",\n")
		.concat("	fps:").concat(document.frameRate).concat(",\n")
		.concat("	color:'").concat(document.backgroundColor).concat("',\n")
		.concat("	atlas: {\n")
		.concat("		name:'").concat(fileName).concat("',\n")
		.concat("		image:'").concat(fileName).concat(".png',\n")
		.concat("		metadata:'").concat(fileName).concat(".json',\n")
		.concat("	}\n")
		.concat("};\n\n")
		.concat("// symbols:\n")
		.concat(generateSymbols(fileName))
	.concat("})(lib = lib||{});\n")
	.concat("var lib;");

	return out;
}

/* Main */

var main = function() {
	var fileURL =  fl.browseForFileURL("save", "Select a JS", "Phaser Asset Document (*.js)", "js");

	if(!fileURL)
		return;
	
	for (var i = 0; i < libItems.length; i++)
	{
		var item = libItems[i];
		
		// ignore items without linkage unless is referenced as instance in other item
		if(!item.linkageClassName)
			continue;
		
		addSpriteSheetExportLibraryItem(item);	
	}

	var fileNoExtURL = fileURL.substr(0, fileURL.length - 3);
	var fileName = fileNoExtURL.substr(fileNoExtURL.lastIndexOf("/")+1, fileNoExtURL.length);
	
	fl.outputPanel.clear();
	fl.trace(generateAssetsFile(fileName));
	fl.outputPanel.save(fileURL);

	sse.autoSize = true;
	sse.allowRotate = true;
	sse.layoutFormat = "JSON";
	sse.exportSpriteSheet(fileNoExtURL, {format:"png", bitDepth:32, backgroundColor:"#00000000"});

	fl.trace("exported assets successfully.");
}
main();
