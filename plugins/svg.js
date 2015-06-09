/** @preserve
jsPDF SVG plugin
Copyright (c) 2012 Willow Systems Corporation, willow-systems.com
*/
/**
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */

;(function(jsPDFAPI) {
'use strict'

/**
Parses SVG XML and converts only some of the SVG elements into
PDF elements.

Supports:
 paths

@public
@function
@param
@returns {Type}
*/
jsPDFAPI.addSVG = function(svgtext, x, y, w, h) {
	// 'this' is _jsPDF object returned when jsPDF is inited (new jsPDF())

	var undef

	if (x === undef || y === undef) {
		throw new Error("addSVG needs values for 'x' and 'y'");
	}

    function InjectCSS(cssbody, document) {
        var styletag = document.createElement('style');
        styletag.type = 'text/css';
        if (styletag.styleSheet) {
        	// ie
            styletag.styleSheet.cssText = cssbody;
        } else {
        	// others
            styletag.appendChild(document.createTextNode(cssbody));
        }
        document.getElementsByTagName("head")[0].appendChild(styletag);
    }

	function createWorkerNode(document){

		var frameID = 'childframe' // Date.now().toString() + '_' + (Math.random() * 100).toString()
		, frame = document.createElement('iframe')

		InjectCSS(
			'.jsPDF_sillysvg_iframe {display:none;position:absolute;}'
			, document
		)

		frame.name = frameID
		frame.setAttribute("width", 0)
		frame.setAttribute("height", 0)
		frame.setAttribute("frameborder", "0")
		frame.setAttribute("scrolling", "no")
		frame.setAttribute("seamless", "seamless")
		frame.setAttribute("class", "jsPDF_sillysvg_iframe")

		document.body.appendChild(frame)

		return frame
	}

	function attachSVGToWorkerNode(svgtext, frame){
		var framedoc = ( frame.contentWindow || frame.contentDocument ).document
		framedoc.write(svgtext)
		framedoc.close()
		return framedoc.getElementsByTagName('svg')[0]
	}

	function convertPathToPDFLinesArgs(path){
		'use strict'
		// we will use 'lines' method call. it needs:
		// - starting coordinate pair
		// - array of arrays of vector shifts (2-len for line, 6 len for bezier)
		// - scale array [horizontal, vertical] ratios
		// - style (stroke, fill, both)

            var x = parseFloat(path[1])
                ,y = parseFloat(path[2])
                ,vectors = []
                ,position = 3
                ,len = path.length
                ,_x = x
                ,_y = y
                ,lastCommand = 'M'
                ,thisCommand = 'M';

            //MmZzLlHhVvCcSsQqTtAa
            //____________XXXXXX__    

            while (position < len) {
                thisCommand = path[position];
                if (!isNaN(parseFloat(thisCommand))) {
                    thisCommand = lastcommand;
                    position--;
                }
                switch (thisCommand) {
                    case 'm':
                        vectors.push(['h']);
                        var m = [
                            parseFloat(path[position + 1]),
                            parseFloat(path[position + 2])
                        ];
                        vectors.push(m)
                        position += 3;
                        _x += m[0];
                        _y += m[1];
                        lastcommand = 'm'
                        break;
                    case 'M':
                        vectors.push(['h']);
                        var M = [
                            parseFloat(path[position + 1]) - _x,
                            parseFloat(path[position + 2]) - _y
                        ];
                        vectors.push(M)
                        position += 3;
                        _x += M[0];
                        _y += M[1];
                        lastcommand = 'M'
                        break;
                    case 'c':
                        var c = [
                            parseFloat(path[position + 1]),
                            parseFloat(path[position + 2]),
                            parseFloat(path[position + 3]),
                            parseFloat(path[position + 4]),
                            parseFloat(path[position + 5]),
                            parseFloat(path[position + 6])
                        ];
                        vectors.push(c);
                        position += 7;
                        _x += c[4];
                        _y += c[5];
                        lastcommand = 'c'
                        break
                    case 'C':
                        var C = [
                            parseFloat(path[position + 1]) - _x,
                            parseFloat(path[position + 2]) - _y,
                            parseFloat(path[position + 3]) - _x,
                            parseFloat(path[position + 4]) - _y,
                            parseFloat(path[position + 5]) - _x,
                            parseFloat(path[position + 6]) - _y
                        ];
                        vectors.push(C);
                        position += 7;
                        _x += C[4];
                        _y += C[5];
                        lastcommand = 'C'
                        break;
                    case 'l':
                        var l = [
                            parseFloat(path[position + 1]),
                            parseFloat(path[position + 2])
                        ];
                        vectors.push(l)
                        position += 3;
                        _x += l[0];
                        _y += l[1];
                        lastcommand = 'l'
                        break;
                    case 'L':
                        var L = [
                            parseFloat(path[position + 1]) - _x,
                            parseFloat(path[position + 2]) - _y
                        ];
                        vectors.push(L)
                        position += 3;
                        _x += L[0];
                        _y += L[1];

                        lastcommand = 'L'
                        break;
                    case 'v':
                        var l = [
                            0,
                            parseFloat(path[position + 1])
                        ];
                        vectors.push(l)
                        position += 2;
                        _y += l[1];
                        lastcommand = 'v'
                        break;
                    case 'V':
                        var L = [
                            0,
                            parseFloat(path[position + 1]) - _y
                        ];
                        vectors.push(L);
                        position += 2;
                        _y += L[1];
                        lastcommand = 'V'
                        break;
                    case 'h':
                        var h = [
                            parseFloat(path[position + 1]),
                            0
                        ];
                        vectors.push(h);
                        position += 2;
                        _x += h[0];
                        lastcommand = 'h'
                        break;
                    case 'H':
                        var H = [
                            parseFloat(path[position + 1]) - _x,
                            0
                        ];
                        vectors.push(H);
                        position += 2;
                        _x += H[0];
                        lastcommand = 'H'
                        break;
                    case 'A':
                        //A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                        var rx = parseFloat(path[position + 1]);
                        var ry = parseFloat(path[position + 2]);
                        var rotation = parseFloat(path[position + 3]);
                        var largeArc = parseInt(path[position + 4]);
                        var sweep = parseInt(path[position + 5]);
                        var x = parseFloat(path[position + 6]);
                        var y = parseFloat(path[position + 7]);

                        var A = [];

                        A = arc2curve(_x, _y, rx, ry, rotation, largeArc, sweep, x, y);

                        for (var a = 0, _a = A.length; a < _a; a += 6) {
                            var _A = [
                                A[a] - _x,
                                A[a + 1] - _y,
                                A[a + 2] - _x,
                                A[a + 3] - _y,
                                A[a + 4] - _x,
                                A[a + 5] - _y,
                            ];
                            vectors.push(_A);
                            _x += _A[4];
                            _y += _A[5];
                        }

                        position += 8
                        lastcommand = 'C'
                        break;
                    case 'a':
                        //A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                        var rx = parseFloat(path[position + 1]);
                        var ry = parseFloat(path[position + 2]);
                        var rotation = parseFloat(path[position + 3]);
                        var largeArc = parseInt(path[position + 4]);
                        var sweep = parseInt(path[position + 5]);
                        var x = parseFloat(path[position + 6]) + _x;
                        var y = parseFloat(path[position + 7]) + _y;

                        var A = [];

                        A = arc2curve(_x, _y, rx, ry, rotation, largeArc, sweep, x, y);

                        for (var a = 0, _a = A.length; a < _a; a += 6) {
                            var _A = [
                                A[a] - _x,
                                A[a + 1] - _y,
                                A[a + 2] - _x,
                                A[a + 3] - _y,
                                A[a + 4] - _x,
                                A[a + 5] - _y,
                            ];
                            vectors.push(_A);
                            _x += _A[4];
                            _y += _A[5];
                        }

                        position += 8
                        lastcommand = 'C'
                        break;
                    default:
                        position += 1
                        break;
                }
            }
            return [x, y, vectors]
        }
        var arc2curve = function(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
            // for more information of where this math came from visit:
            // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
            var _120 = Math.PI * 120 / 180,
                rad = Math.PI / 180 * (+angle || 0),
                res = [],
                xy,
                rotate = function(x, y, rad) {
                    var X = x * Math.cos(rad) - y * Math.sin(rad),
                        Y = x * Math.sin(rad) + y * Math.cos(rad);
                    return {
                        x: X,
                        y: Y
                    };
                };
            if (!recursive) {
                xy = rotate(x1, y1, -rad);
                x1 = xy.x;
                y1 = xy.y;
                xy = rotate(x2, y2, -rad);
                x2 = xy.x;
                y2 = xy.y;
                var cos = Math.cos(Math.PI / 180 * angle),
                    sin = Math.sin(Math.PI / 180 * angle),
                    x = (x1 - x2) / 2,
                    y = (y1 - y2) / 2;
                var h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
                if (h > 1) {
                    h = Math.sqrt(h);
                    rx = h * rx;
                    ry = h * ry;
                }
                var rx2 = rx * rx,
                    ry2 = ry * ry,
                    k = (large_arc_flag == sweep_flag ? -1 : 1) *
                        Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))),
                    cx = k * rx * y / ry + (x1 + x2) / 2,
                    cy = k * -ry * x / rx + (y1 + y2) / 2,
                    f1 = Math.asin(((y1 - cy) / ry).toFixed(9)),
                    f2 = Math.asin(((y2 - cy) / ry).toFixed(9));

                f1 = x1 < cx ? Math.PI - f1 : f1;
                f2 = x2 < cx ? Math.PI - f2 : f2;
                f1 < 0 && (f1 = Math.PI * 2 + f1);
                f2 < 0 && (f2 = Math.PI * 2 + f2);
                if (sweep_flag && f1 > f2) {
                    f1 = f1 - Math.PI * 2;
                }
                if (!sweep_flag && f2 > f1) {
                    f2 = f2 - Math.PI * 2;
                }
            } else {
                f1 = recursive[0];
                f2 = recursive[1];
                cx = recursive[2];
                cy = recursive[3];
            }
            var df = f2 - f1;
            if (Math.abs(df) > _120) {
                var f2old = f2,
                    x2old = x2,
                    y2old = y2;
                f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
                x2 = cx + rx * Math.cos(f2);
                y2 = cy + ry * Math.sin(f2);
                res = arc2curve(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
            }
            df = f2 - f1;
            var c1 = Math.cos(f1),
                s1 = Math.sin(f1),
                c2 = Math.cos(f2),
                s2 = Math.sin(f2),
                t = Math.tan(df / 4),
                hx = 4 / 3 * rx * t,
                hy = 4 / 3 * ry * t,
                m1 = [x1, y1],
                m2 = [x1 + hx * s1, y1 - hy * c1],
                m3 = [x2 + hx * s2, y2 - hy * c2],
                m4 = [x2, y2];
            m2[0] = 2 * m1[0] - m2[0];
            m2[1] = 2 * m1[1] - m2[1];
            if (recursive) {
                return [m2, m3, m4].concat(res);
            } else {
                res = [m2, m3, m4].concat(res).join().split(",");
                var newres = [];
                for (var i = 0, ii = res.length; i < ii; i++) {
                    newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x;
                }
                return newres;
            }

        }

        var workernode = createWorkerNode(document),
            svgnode = attachSVGToWorkerNode(svgtext, workernode),
            scale = [1, 1],
            svgw = parseFloat(svgnode.getAttribute('width')),
            svgh = parseFloat(svgnode.getAttribute('height'))

            if (svgw && svgh) {
                // setting both w and h makes image stretch to size.
                // this may distort the image, but fits your demanded size
                if (w && h) {
                    scale = [w / svgw, h / svgh]
                }
                // if only one is set, that value is set as max and SVG 
                // is scaled proportionately.
                else if (w) {
                    scale = [w / svgw, w / svgw]
                } else if (h) {
                    scale = [h / svgh, h / svgh]
                }
            }

        var getColor = function(hex) {
            var rgba = {
                r: 0,
                g: 0,
                b: 0,
                a: 1
            };
            if (!hex) return rgba;
            if (hex === 'none') {
                rgba.a = 0;
                return rgba;
            }
            if (hex.substring(0, 3) == 'rgb') {
                var re = /rgb(a)?\(([0-9]+)[,\s]+([0-9]+)[,\s]+([0-9]+)[,\s]?([0-9.]+)?\)/;
                var matches = re.exec(hex);
                if (matches) {
                    rgba.r = parseInt(matches[2]);
                    rgba.g = parseInt(matches[3]);
                    rgba.b = parseInt(matches[4]);
                    if (matches[1] && matches[5]) {
                        rgba.a = parseFloat(matches[5]);
                    }
                }
            } else if (hex.substring(0, 1) === '#') {
                if (hex.length == 4) {
                    rgba.r = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
                    rgba.g = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
                    rgba.b = parseInt(hex.substring(3, 4) + hex.substring(3, 4), 16);
                } else {
                    rgba.r = parseInt(hex.substring(1, 3), 16);
                    rgba.g = parseInt(hex.substring(3, 5), 16);
                    rgba.b = parseInt(hex.substring(5, 7), 16);
                }
            } else {
                var colors = {
                    aqua: [0, 255, 255],
                    azure: [240, 255, 255],
                    beige: [245, 245, 220],
                    black: [0, 0, 0],
                    blue: [0, 0, 255],
                    brown: [165, 42, 42],
                    cyan: [0, 255, 255],
                    darkblue: [0, 0, 139],
                    darkcyan: [0, 139, 139],
                    darkgrey: [169, 169, 169],
                    darkgreen: [0, 100, 0],
                    darkkhaki: [189, 183, 107],
                    darkmagenta: [139, 0, 139],
                    darkolivegreen: [85, 107, 47],
                    darkorange: [255, 140, 0],
                    darkorchid: [153, 50, 204],
                    darkred: [139, 0, 0],
                    darksalmon: [233, 150, 122],
                    darkviolet: [148, 0, 211],
                    fuchsia: [255, 0, 255],
                    gold: [255, 215, 0],
                    green: [0, 128, 0],
                    indigo: [75, 0, 130],
                    khaki: [240, 230, 140],
                    lightblue: [173, 216, 230],
                    lightcyan: [224, 255, 255],
                    lightgreen: [144, 238, 144],
                    lightgrey: [211, 211, 211],
                    lightpink: [255, 182, 193],
                    lightyellow: [255, 255, 224],
                    lime: [0, 255, 0],
                    magenta: [255, 0, 255],
                    maroon: [128, 0, 0],
                    navy: [0, 0, 128],
                    olive: [128, 128, 0],
                    orange: [255, 165, 0],
                    pink: [255, 192, 203],
                    purple: [128, 0, 128],
                    violet: [128, 0, 128],
                    red: [255, 0, 0],
                    silver: [192, 192, 192],
                    white: [255, 255, 255],
                    yellow: [255, 255, 0],
                    transparent: [255, 255, 255]
                };
                if (colors[hex]) {
                    rgba.r = colors[hex][0];
                    rgba.g = colors[hex][1];
                    rgba.b = colors[hex][2];
                }

            }
            //rgba.a = hex.length > 7? parseInt(hex.substring(7,9), 16): 1;  
            return rgba;
        }

        var getTransforms = function(tag, transform) {
            /**
             * Merge defaults with user options
             * @private
             * @param {Object} defaults Default settings
             * @param {Object} options User options
             * @returns {Object} Merged values of defaults and options
             */
            var extend = function(defaults, options) {
                var extended = {};
                var merge = function(obj) {
                    for (var prop in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                            extended[prop] = obj[prop];
                        }
                    }
                };
                merge(arguments[0]);
                for (var i = 1; i < arguments.length; i++) {
                    var obj = arguments[i];
                    merge(obj);
                }
                return extended;
            };
            transform = extend({
                scale: {
                    x: 1,
                    y: 1
                },
                translate: {
                    x: 0,
                    y: 0
                },
                rotate: {
                    angle: 0,
                    x: 0,
                    y: 0
                }
            }, transform);

            if (!tag.hasAttribute('transform')) return transform;

            var transformStr = tag.getAttribute('transform');


            if (transformStr) {
                var found;
                var reg = /([a-z]+)\(([0-9.]+)[ ,]*([0-9.]+)?[ ,]*([0-9.]+)?\)/g;
                while ((found = reg.exec(transformStr))) {
                    var y = 0;
                    var x = parseFloat(found[2]);

                    switch (found[1]) {
                        case 'translate':
                            if (found[3].length == 0) {
                                y = 0;
                            } else {
                                y = parseFloat(found[3]);
                            }
                            y += transform.translate.y;
                            x += transform.translate.x;
                            transform[found[1]] = {
                                x: x,
                                y: y
                            };
                            break;
                        case 'scale':
                            if (found[3].length == 0) {
                                y = x;
                            } else {
                                y = parseFloat(found[3]);
                            }
                            y *= transform.scale.y;
                            x *= transform.scale.x;
                            transform[found[1]] = {
                                x: x,
                                y: y
                            };
                            break;
                        case 'rotate':
                            var angle = x;
                            transform[found[1]] = {
                                angle: -angle,
                                x: found[3].length > 0 ? parseFloat(found[3]) : 0,
                                y: found[4].length > 0 ? parseFloat(found[4]) : 0
                            };
                            //transform.translate.x += x;
                            //transform.translate.y += y;
                            break;
                    }
                }
            }
            return transform;
        }

        var getAttribute = function(tag, name, defaultVal) {
            if (!tag.hasAttribute(name)) {
                return defaultVal;
            }
            return tag.getAttribute(name);
        }

        var parseNodes = function(doc, tag, base, scale, transform) {

            transform = getTransforms(tag, transform);

            var _scale = [scale[0] * transform.scale.x, scale[1] * transform.scale.y];
            var styles = {};


            if (tag.hasAttribute('style')) {
                var styleTag = tag.getAttribute('style');

                styleTag = styleTag.split(/[;:]/);
                for (var i = 0, _i = styleTag.length; i < _i; i += 2) {
                    if (styleTag[i + 1])
                        styles[styleTag[i].trim()] = styleTag[i + 1].trim();
                }

            }

            var stroke = {};
            if (tag.hasAttribute('stroke')) {
                stroke.color = getColor(tag.getAttribute('stroke'));

                if (tag.hasAttribute('stroke-opacity')) {
                    stroke.opacity = parseFloat(tag.getAttribute('stroke-opacity'));
                } else {
                    stroke.opacity = stroke.color.a;
                }
            } else if (styles.stroke) {
                stroke.color = getColor(styles.stroke);
                stroke.opacity = stroke.color.a; // until i learn otherwise
            }

            if (tag.hasAttribute('stroke-width')) {
                stroke.width = parseFloat(tag.getAttribute('stroke-width'));
                if (isNaN(stroke.width)) {
                    stroke.width = 1;
                }
            } else if (styles['stroke-width']) {
                stroke.width = parseFloat(styles['stroke-width']);
            } else if (stroke.color) {
                stroke.width = 1;
            }

            var fill = {};

            if (tag.hasAttribute('fill')) {
                fill.color = getColor(tag.getAttribute('fill'));

            }


            var linesargs;
            if (tag.tagName) {
                switch (tag.tagName.toUpperCase()) {
                    case 'RECT':
                        var x = parseFloat(getAttribute(tag, 'x', '0'));
                        var y = parseFloat(getAttribute(tag, 'y', '0'));
                        var rx = parseFloat(getAttribute(tag, 'rx', '0'));
                        var ry = parseFloat(getAttribute(tag, 'ry', '0'));
                        var width = parseFloat(getAttribute(tag, 'width', '0'));
                        var height = parseFloat(getAttribute(tag, 'height', '0'));
                        if (height === 0 || width === 0) break;

                        var d = ['M', x + rx, y, 'h', width - 2 * rx];
                        if (rx !== 0 && ry !== 0) {
                            d = d.concat(['a', rx, ry, 0, 0, 1, rx, ry]);
                        }
                        d = d.concat(['v', height - 2 * ry]);
                        if (rx !== 0 && ry !== 0) {
                            d = d.concat(['a', rx, ry, 0, 0, 1, -rx, ry]);
                        }
                        d = d.concat(['h', 2 * rx - width]);
                        if (rx !== 0 && ry !== 0) {
                            d = d.concat(['a', rx, ry, 0, 0, 1, -rx, -ry]);
                        }
                        d = d.concat(['v', 2 * ry - height]);
                        if (rx !== 0 && ry !== 0) {
                            d = d.concat(['a', rx, ry, 0, 0, 1, rx, -ry]);
                        }
                        d = d.concat(['z']);
                        var style = '';
                        if (stroke.color) {
                            if (stroke.opacity > 0.5) {
                                style += 'D';
                            }
                            doc.setDrawColor(stroke.color.r, stroke.color.g, stroke.color.b);
                            doc.setLineWidth(stroke.width * _scale[0]);
                        }

                        if (fill.color) {
                            if (fill.color.a > 0.5) {
                                style += 'F';
                                doc.setFillColor(fill.color.r, fill.color.g, fill.color.b);
                            }
                        }


                        if (style == 'none' || style == '') break;
                        linesargs = convertPathToPDFLinesArgs(d); //.split(' ') 
                        // path start x coordinate
                        linesargs[0] = (linesargs[0] + transform.translate.x) * _scale[0] + base.x // where base.x is upper left X of image
                        // path start y coordinate
                        linesargs[1] = (linesargs[1] + transform.translate.y) * _scale[1] + base.y // where base.y is upper left Y of image
                        // the rest of lines are vectors. these will adjust with scale value auto.

                        doc.lines(
                            linesargs[2] // lines
                            , linesargs[0] // starting x
                            , linesargs[1] // starting y
                            , _scale, style
                        );

                        break;
                    case 'PATH':
                        var pathsD = [];
                        var d = [];
                        var found;
                        var reg = /[MmZzLlHhVvCcSsQqTtAa]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
                        var dStr = tag.getAttribute("d");
                        while ((found = reg.exec(dStr))) {
                            if (d.length > 0 && (found[0] == 'M' || found[0] == 'm')) {
                                //pathsD.push(d);
                                //d =[];
                            }
                            d.push(found[0]);
                        }
                        pathsD.push(d);

                        var close = (d[d.length - 1].toLowerCase() == 'z');

                        var style = '';
                        if (stroke.color) {
                            if (stroke.opacity > 0.5) {
                                style += 'D';
                            }
                            doc.setDrawColor(stroke.color.r, stroke.color.g, stroke.color.b);
                            doc.setLineWidth(stroke.width * _scale[0]);
                        }

                        if (fill.color) {
                            if (fill.color.a > 0.5) {
                                style += 'F';
                                doc.setFillColor(fill.color.r, fill.color.g, fill.color.b);
                            }
                        }


                        if (style == 'none' || style == '') break;
                        for (var i = 0, _i = pathsD.length; i < _i; i++) {
                            d = pathsD[i];
                            linesargs = convertPathToPDFLinesArgs(d); //.split(' ') 
                            // path start x coordinate
                            linesargs[0] = (linesargs[0] + transform.translate.x) * _scale[0] + base.x // where base.x is upper left X of image
                            // path start y coordinate
                            linesargs[1] = (linesargs[1] + transform.translate.y) * _scale[1] + base.y // where base.y is upper left Y of image
                            // the rest of lines are vectors. these will adjust with scale value auto.

                            doc.lines(
                                linesargs[2] // lines
                                , linesargs[0] // starting x
                                , linesargs[1] // starting y
                                , _scale, style
                            )
                        }
                        break;
                    case 'LINE':
                        doc.lines(
                            [
                                (parseFloat(tag.getAttribute('x2')) + transform.translate.x) * _scale[0] + base.x, (parseFloat(tag.getAttribute('y2')) + transform.translate.y) * _scale[1] + base.y
                            ] // lines

                            , (parseFloat(tag.getAttribute('x1')) + transform.translate.x) * _scale[0] + base.x // starting x
                            , (parseFloat(tag.getAttribute('y1')) + transform.translate.y) * _scale[1] + base.y // starting y
                            , _scale, style
                        )
                        break;
                    case 'TEXT':
                        if (!tag.textContent || tag.textContent.length === 0) break;

                        var font = 'Helvetica';
                        if (tag.hasAttribute('font-family')) {
                            switch (node.getAttribute('font-family').toLowerCase()) {
                                case 'serif':
                                    font = 'Times';
                                    break;
                                case 'monospace':
                                    font = 'Courier';
                                    break;
                                default:
                                    font = 'Helvetica';
                                    break;
                            }
                        }

                        var rotate;
                        if (transform.rotate.angle != 0) {
                            rotate = transform.rotate;
                            rotate.x = (rotate.x + transform.translate.x) * _scale[0] + base.x;
                            rotate.y = (rotate.y + transform.translate.y) * _scale[1] + base.y;
                        }


                        var fontType = '';
                        if (tag.hasAttribute('font-weight')) {
                            if (tag.getAttribute('font-weight') == "bold") {
                                fontType = "Bold";
                            }
                        }
                        if (tag.hasAttribute('font-style')) {
                            if (tag.getAttribute('font-style') == "italic") {
                                fontType += "Oblique";
                            }
                        }
                        doc.setFont(font, fontType);

                        if (tag.hasAttribute('fill')) {
                            var fill = tag.getAttribute('fill');
                            if (fill) {
                                if (fill == 'none') {
                                    fill = !fill ? 'none' : fill;
                                } else {
                                    var rgba = getColor(fill);
                                    doc.setTextColor(rgba.r, rgba.g, rgba.b);
                                }
                            } else if (style == '') {
                                doc.setTextColor(0, 0, 0);
                            }
                        } else if (styles.color) {
                            var rgba = getColor(styles.color);
                            doc.setTextColor(rgba.r, rgba.g, rgba.b);
                        }



                        var pdfFontSize = 16;
                        if (tag.hasAttribute('font-size')) {
                            pdfFontSize = parseFloat(tag.getAttribute('font-size'));
                        } else if (styles['font-size']) {
                            pdfFontSize = parseFloat(styles['font-size']);
                        }
                        console.log('_scale[0]:', _scale[0]);
                        pdfFontSize *= _scale[0] * 3;
                        var xPos, yPos, xOffset = 0,
                            align;
                        if (tag.hasAttribute('text-anchor')) {
                            switch (tag.getAttribute('text-anchor')) {
                                case 'end':
                                    align = "right";
                                    break;
                                case 'middle':
                                    align = "center";
                                    break;
                                case 'start':
                                    break;
                                case 'default':
                                    break;;
                            }
                        }

                        xPos = tag.hasAttribute('x') ? parseFloat(tag.getAttribute('x')) - xOffset : -offset;
                        yPos = tag.hasAttribute('y') ? parseFloat(tag.getAttribute('y')) : 0;

                        doc.setFontSize(pdfFontSize);

                        if (tag.childNodes.length > 0) {
                            for (var c = 0, _c = tag.childNodes.length; c < _c; c++) {
                                var cn = tag.childNodes[c];
                                if (cn.nodeType === 3) {
                                    // #text
                                    doc.text(
                                        cn.data, (xPos + transform.translate.x) * _scale[0] + base.x, (yPos + transform.translate.y) * _scale[1] + base.y,
                                        align,
                                        rotate
                                    );
                                } else if (cn.nodeName == 'tspan') {
                                    var cx = xPos;
                                    var cy = yPos;
                                    if (cn.hasAttribute('x')) {
                                        cx = parseFloat(cn.getAttribute('x')) - xOffset;
                                    }
                                    if (cn.hasAttribute('y')) {
                                        cy = parseFloat(cn.getAttribute('y'));
                                    }
                                    if (cn.hasAttribute('dx')) {
                                        cx = cx + parseFloat(cn.getAttribute('dx'));
                                    }
                                    if (cn.hasAttribute('dy')) {
                                        cy = cy + parseFloat(cn.getAttribute('dy'));
                                    }
                                    doc.text(
                                        cn.innerHTML, (cx + transform.translate.x) * _scale[0] + base.x, (cy + transform.translate.y) * _scale[1] + base.y,
                                        align,
                                        !rotate? 0: rotate.angle
                                    );
                                }
                            }

                        }

                        break;
                    case 'G':
                        var i, l, tmp, items = tag.childNodes
                        for (i = 0, l = items.length; i < l; i++) {
                            tmp = items[i]
                            parseNodes(doc, tmp, base, _scale, transform);
                        }
                        break;
                    case 'DEFS':
                        for (var i = 0, _i = tag.childNodes.length; i < _i; i++) {
                            var def = tag.childNodes[i];
                            var id = def.id;

                        }
                        break;
                }
            }
        }

        var defs = {};

        var i, l, tmp, linesargs, items = svgnode.childNodes
        for (i = 0, l = items.length; i < l; i++) {
            tmp = items[i];
            if (tmp.nodeType === 3) continue;

            parseNodes(this, tmp, {
                x: x,
                y: y
            }, scale);
        }


        // clean up
        // workernode.parentNode.removeChild(workernode)

        return this
    }

})(jsPDF.API);
