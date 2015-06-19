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
		if(typeof svgtext == 'string'){
			var framedoc = ( frame.contentWindow || frame.contentDocument ).document
			framedoc.write(svgtext)
			framedoc.close()
			return framedoc.getElementsByTagName('svg')[0]
		}
		return svgtext.childNodes[0];
	}

	
	function convertPathToPDFLinesArgs(path){
		'use strict'
		// we will use 'lines' method call. it needs:
		// - starting coordinate pair
		// - array of arrays of vector shifts (2-len for line, 6 len for bezier)
		// - scale array [horizontal, vertical] ratios
		// - style (stroke, fill, both)


		var pos = 0,
			paths = [],
			subPath = [],
			thisCmd = 'M',
			lastCmd = '',
			nextLastCmd = '',
			regr = /[MmLlHhVvCcSsQqTtAaZz]|-?[0-9]+(?:\.[0-9]+)?(?:[eE][-+][0-9]+)?/g,
			match,
			x = 0,
			y = 0,
			dx,
			dy,
			next = function(){
				if(Array.isArray(path)){
					if(pos >= path.length) return null;
					return path[pos++];
				}
				var ret = regr.exec(path);
				if(ret === null) return null;
				return ret[0];
			},
			posBack = function(match){
				if(Array.isArray(path)){
					pos--;
				}else{
					regr.lastIndex = regr.lastIndex - match.length;
				}
			};
		while ((match = next()) !== null) {
			var vals = [];
			if (isNaN(match)) {
				thisCmd = match;
			} else {
				thisCmd = lastCmd;
				posBack(match);
			}
			if (thisCmd === 'M' && lastCmd === thisCmd) {
				thisCmd = 'L';
			}else if (thisCmd === 'm' && lastCmd === thisCmd) {
				thisCmd = 'l';
			}
			dx=0;
			dy=0;
			nextLastCmd = thisCmd;
			switch (thisCmd) {
				case 'M':
					if(subPath.length){
						paths.push(subPath.slice());
						subPath = [];
					}
					vals[0] = cleanNum(next());
					vals[1] = cleanNum(next());
					dx = vals[0] - x;
					dy = vals[1] - y;
					thisCmd = 'm';
					break;
				case 'm':
					if(subPath.length){
						paths.push(subPath.slice());
						subPath = [];
					}
					vals[0] = cleanNum(next(),+x);
					vals[1] = cleanNum(next(),+y);
					dx = vals[0] - x;
					dy = vals[1] - y;
					break;
				case 'L':
					vals[0] = cleanNum(next(), -x);
					vals[1] = cleanNum(next(), -y);
					dx = vals[0];
					dy = vals[1];
					thisCmd = 'l';
					break;
				case 'l':
					vals[0] = cleanNum(next());
					vals[1] = cleanNum(next());
					dx = vals[0];
					dy = vals[1];
					break;
				case 'H':
					vals[0] = cleanNum(next(), -x);
					vals[1] = 0;
					thisCmd = 'l';
					dx = vals[0];
					break;
				case 'h':
					vals[0] = cleanNum(next());
					vals[1] = 0;
					thisCmd = 'l';
					dx = vals[0];
					break;
				case 'V':
					vals[0] = 0;
					vals[1] = cleanNum(next(), -y);
					thisCmd = 'l';
					dy = vals[1];
					break;
				case 'v':
					vals[0] = x;
					vals[1] = cleanNum(next());
					thisCmd = 'l';
					dy = vals[1];
					break;
				case 'C':
					vals[0] = cleanNum(next(), -x);
					vals[1] = cleanNum(next(), -y);
					vals[2] = cleanNum(next(), -x);
					vals[3] = cleanNum(next(), -y);
					vals[4] = cleanNum(next(), -x);
					vals[5] = cleanNum(next(), -y);
					dx = vals[4];
					dy = vals[5];
					thisCmd = 'c';
					break;
				case 'c':
					vals[0] = cleanNum(next());
					vals[1] = cleanNum(next());
					vals[2] = cleanNum(next());
					vals[3] = cleanNum(next());
					vals[4] = cleanNum(next());
					vals[5] = cleanNum(next());
					dx = vals[4];
					dy = vals[5];
					thisCmd = 'c';
					break;
				case 'S':
					var lastPath = subPath[subPath.length - 1];;
					switch (lastCmd) {
						case 'c':
						case 'C':
						case 'S':
						case 's':
							vals[0] = lastPath[4] - lastPath[2];
							vals[1] = lastPath[5] - lastPath[3];
							break;
						default:
							vals[0] = 0;
							vals[1] = 0;
							break;
					}

					vals[2] = cleanNum(next(), -x);
					vals[3] = cleanNum(next(), -y);
					vals[4] = cleanNum(next(), -x);
					vals[5] = cleanNum(next(), -y);
					thisCmd = 'c';
					dx = vals[4];
					dy = vals[5];
					break;
				case 's':
					var lastPath = subPath[subPath.length - 1];;
					switch (lastCmd) {
						case 'c':
						case 'C':
						case 's':
						case 'S':
							vals[0] = lastPath[4] - lastPath[2];
							vals[1] = lastPath[5] - lastPath[3];
							break;
						default:
							vals[0] = x;
							vals[1] = y;
							break;
					}
					vals[2] = cleanNum(next());
					vals[3] = cleanNum(next());
					vals[4] = cleanNum(next());
					vals[5] = cleanNum(next());
					thisCmd = 'c';
					dx = vals[4];
					dy = vals[5];
					break;
				case 'Q':
					vals[0] = cleanNum(next(), -x);
					vals[1] = cleanNum(next(), -y);
					vals[2] = vals[0];
					vals[3] = vals[1];
					vals[4] = cleanNum(next(), -x);
					vals[5] = cleanNum(next(), -y);
					thisCmd = 'c';
					dx = vals[4];
					dy = vals[5];
					break;
				case 'q':
					vals[0] = cleanNum(next());
					vals[1] = cleanNum(next());
					vals[2] = vals[0];
					vals[3] = vals[1];
					vals[4] = cleanNum(next());
					vals[5] = cleanNum(next());
					thisCmd = 'c';
					dx = vals[4];
					dy = vals[5];
					break;
				case 'T':
					var lastPath = subPath[subPath.length - 1];;
					switch (lastCmd) {
						case 'c':
						case 'C':
						case 't':
						case 'T':
							vals[0] = lastPath[4] - lastPath[2];
							vals[1] = lastPath[5] - lastPath[3];
							break;
						default:
							vals[0] = x;
							vals[1] = y;
							break;
					}
					vals[2] = vals[0];
					vals[3] = vals[1];
					vals[4] = cleanNum(next(), -x);
					vals[5] = cleanNum(next(), -y);
					thisCmd = 'c';
					dx = vals[4];
					dy = vals[5];
					break;
				case 't':
					var lastPath = subPath[subPath.length - 1];;
					switch (lastCmd) {
						case 'c':
						case 'C':
						case 't':
						case 'T':
							vals[0] = lastPath[4] - lastPath[2];
							vals[1] = lastPath[5] - lastPath[3];
							break;
						default:
							vals[0] = x;
							vals[1] = y;
							break;
					}
					vals[2] = vals[0];
					vals[3] = vals[1];
					vals[4] = cleanNum(next());
					vals[5] = cleanNum(next());
					thisCmd = 'c';
					dx =  vals[4];
					dy =  vals[5];
					break;
				case 'A':
					vals = arc2curve(
						x,
						y,
						parseFloat(next()), // rx
						parseFloat(next()), // ry
						parseFloat(next()), // rotation
						parseInt(next()), //largeArc
						parseInt(next()), //sweep
						parseFloat(next()), // x
						parseFloat(next()) // y
					);
					for(var a=0;a<vals.length;a+=2){
						if(a && a%6===0){
							x += vals[4];
							y += vals[5];
							subPath.push(vals.splice(a-6,6));
							a=0;
						}
						vals[a] -= x;
						vals[a+1] -= y;
					}
					thisCmd = 'c';
					dx = vals[4]||0;
					dy = vals[5]||0;
					break;
				case 'a':        
					vals = arc2curve(
						x,
						y,
						parseFloat(next()), // rx
						parseFloat(next()), // ry
						parseFloat(next()), // rotation
						parseInt(next()), //largeArc
						parseInt(next()), //sweep
						parseFloat(next()) + x, // x
						parseFloat(next()) + y // y
					);
					for(var a=0;a<vals.length;a+=2){
						if(a && a%6===0){
							x += vals[4];
							y += vals[5];
							subPath.push(vals.splice(a-6,6));
							a=0;
						}
						vals[a] -= x;
						vals[a+1] -= y;
					}
					thisCmd = 'c';
					dx = vals[4]||0;
					dy = vals[5]||0;
					break;
				case 'z':
				case 'Z':
					dx = subPath[0][0] - x;
					dy = subPath[0][1] - y;
					subPath.push('z');
					paths.push(subPath.slice());
					subPath = [];
					nextLastCmd = 'z';
					break;
			}
			x = x + dx;
			y = y + dy;
			lastCmd = nextLastCmd;
			if(vals.length > 0){
				subPath.push(vals);
			}
		}
		if(subPath.length){
			paths.push(subPath);
		}
		return paths;
	}

	function cleanNum(str, add) {
		if(!add) add = 0;
		//str = parseFloat(str) + add;
		//str = str.toFixed(2);
		return parseFloat(str) + add;
	}

        var arc2curve = function(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
		if(x1===x2 && y1===y2) return [];
		if(rx==0 || ry==0){
			return [x1 + (x2-x1)/3, y1 + (y2-y1)/3, x2 - (x2-x1)/3, y2 - (y2-y1)/3, x2, y2];
		}
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
            svgh = parseFloat(svgnode.getAttribute('height')),
	    pagew = this.internal.pageSize.width,
	    pageh = this.internal.pageSize.height,
	    viewBox = svgnode.getAttribute('viewBox')
	    if(viewBox) viewBox = viewBox.split(/[\s,]+/);
		if(svgw && svgw.substr(svgw.length-1,1)=='%'){
			svgw = parseFloat(viewBox[2]);
		}
		if(svgh && svgh.substr(svgh.length-1,1)=='%'){
			svgh = parseFloat(viewBox[3]);
		}

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
                } else {
			if (x === undef && y === undef){
				if(svgw > svgh){
					x = 0;
					w = this.internal.pageSize.width;
					scale = [w/svgw, w/svgw];
					y = (this.internal.pageSize.height - (svgh * scale[1]))/2;
				}else if(svgw < svgh) {
					y = 0;
					h = this.internal.pageSize.height;
					scale = [h / svgh, h / svgh];
					x = (this.internal.pageSize.width - (svgw * scale[0]))/2;
				}else if(pagew < pageh){
					x = 0;
					w = this.internal.pageSize.width;
					scale = [w/svgw, w/svgw];
					y = (this.internal.pageSize.height - (svgh * scale[1]))/2;
				}else{
					y = 0;
					h = this.internal.pageSize.height;
					scale = [h / svgh, h / svgh];
					x = (this.internal.pageSize.width - (svgw * scale[0]))/2;
				}
			}
                }
            }

        var getColor = function(hex) {
        	
		if(hex == 'inherit') return hex;
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
                var re = /rgb(a)?\(([0-9.]+(%)?)\s*,\s*([0-9.]+(%)?)\s*,\s*([0-9.]+(%)?)\s*(?:,\s*([0-9.]+))?\)/;
		var matches = re.exec(hex);
		if (matches) {
			rgba.r = parseFloat(matches[2]);
			rgba.g = parseFloat(matches[4]);
			rgba.b = parseFloat(matches[6]);
			
			if(matches[3]){ rgba.r = rgba.r * 255 / 100; }
			if(matches[5]){ rgba.g = rgba.g * 255 / 100; }
			if(matches[7]){ rgba.b = rgba.b * 255 / 100; }
			
			if (matches[1] && matches[8]) {
				rgba.a = parseFloat(matches[8]);
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
                    
			aliceblue: [240, 248, 255],
			antiquewhite: [250, 235, 215],
			aqua: [0, 255, 255],
			aquamarine: [127, 255, 212],
			azure: [240, 255, 255],
			beige: [245, 245, 220],
			bisque: [255, 228, 196],
			black: [0, 0, 0],
			blanchedalmond: [255, 235, 205],
			blue: [0, 0, 255],
			blueviolet: [138, 43, 226],
			brown: [165, 42, 42],
			burlywood: [222, 184, 135],
			burntsienna: [234, 126, 93],
			cadetblue: [95, 158, 160],
			chartreuse: [127, 255, 0],
			chocolate: [210, 105, 30],
			coral: [255, 127, 80],
			cornflowerblue: [100, 149, 237],
			cornsilk: [255, 248, 220],
			crimson: [220, 20, 60],
			cyan: [0, 255, 255],
			darkblue: [0, 0, 139],
			darkcyan: [0, 139, 139],
			darkgoldenrod: [184, 134, 11],
			darkgray: [169, 169, 169],
			darkgreen: [0, 100, 0],
			darkgrey: [169, 169, 169],
			darkkhaki: [189, 183, 107],
			darkmagenta: [139, 0, 139],
			darkolivegreen: [85, 107, 47],
			darkorange: [255, 140, 0],
			darkorchid: [153, 50, 204],
			darkred: [139, 0, 0],
			darksalmon: [233, 150, 122],
			darkseagreen: [143, 188, 143],
			darkslateblue: [72, 61, 139],
			darkslategray: [47, 79, 79],
			darkslategrey: [47, 79, 79],
			darkturquoise: [0, 206, 209],
			darkviolet: [148, 0, 211],
			deeppink: [255, 20, 147],
			deepskyblue: [0, 191, 255],
			dimgray: [105, 105, 105],
			dimgrey: [105, 105, 105],
			dodgerblue: [30, 144, 255],
			firebrick: [178, 34, 34],
			floralwhite: [255, 250, 240],
			forestgreen: [34, 139, 34],
			fuchsia: [255, 0, 255],
			gainsboro: [220, 220, 220],
			ghostwhite: [248, 248, 255],
			gold: [255, 215, 0],
			goldenrod: [218, 165, 32],
			gray: [128, 128, 128],
			green: [0, 128, 0],
			greenyellow: [173, 255, 47],
			grey: [128, 128, 128],
			honeydew: [240, 255, 240],
			hotpink: [255, 105, 180],
			indianred: [205, 92, 92],
			indigo: [75, 0, 130],
			ivory: [255, 255, 240],
			khaki: [240, 230, 140],
			lavender: [230, 230, 250],
			lavenderblush: [255, 240, 245],
			lawngreen: [124, 252, 0],
			lemonchiffon: [255, 250, 205],
			lightblue: [173, 216, 230],
			lightcoral: [240, 128, 128],
			lightcyan: [224, 255, 255],
			lightgoldenrodyellow: [250, 250, 210],
			lightgray: [211, 211, 211],
			lightgreen: [144, 238, 144],
			lightgrey: [211, 211, 211],
			lightpink: [255, 182, 193],
			lightsalmon: [255, 160, 122],
			lightseagreen: [32, 178, 170],
			lightskyblue: [135, 206, 250],
			lightslategray: [119, 136, 153],
			lightslategrey: [119, 136, 153],
			lightsteelblue: [176, 196, 222],
			lightyellow: [255, 255, 224],
			lime: [0, 255, 0],
			limegreen: [50, 205, 50],
			linen: [250, 240, 230],
			magenta: [255, 0, 255],
			maroon: [128, 0, 0],
			mediumaquamarine: [102, 205, 170],
			mediumblue: [0, 0, 205],
			mediumorchid: [186, 85, 211],
			mediumpurple: [147, 112, 219],
			mediumseagreen: [60, 179, 113],
			mediumslateblue: [123, 104, 238],
			mediumspringgreen: [0, 250, 154],
			mediumturquoise: [72, 209, 204],
			mediumvioletred: [199, 21, 133],
			midnightblue: [25, 25, 112],
			mintcream: [245, 255, 250],
			mistyrose: [255, 228, 225],
			moccasin: [255, 228, 181],
			navajowhite: [255, 222, 173],
			navy: [0, 0, 128],
			oldlace: [253, 245, 230],
			olive: [128, 128, 0],
			olivedrab: [107, 142, 35],
			orange: [255, 165, 0],
			orangered: [255, 69, 0],
			orchid: [218, 112, 214],
			palegoldenrod: [238, 232, 170],
			palegreen: [152, 251, 152],
			paleturquoise: [175, 238, 238],
			palevioletred: [219, 112, 147],
			papayawhip: [255, 239, 213],
			peachpuff: [255, 218, 185],
			peru: [205, 133, 63],
			pink: [255, 192, 203],
			plum: [221, 160, 221],
			powderblue: [176, 224, 230],
			purple: [128, 0, 128],
			rebeccapurple: [102, 51, 153],
			red: [255, 0, 0],
			rosybrown: [188, 143, 143],
			royalblue: [65, 105, 225],
			saddlebrown: [139, 69, 19],
			salmon: [250, 128, 114],
			sandybrown: [244, 164, 96],
			seagreen: [46, 139, 87],
			seashell: [255, 245, 238],
			sienna: [160, 82, 45],
			silver: [192, 192, 192],
			skyblue: [135, 206, 235],
			slateblue: [106, 90, 205],
			slategray: [112, 128, 144],
			slategrey: [112, 128, 144],
			snow: [255, 250, 250],
			springgreen: [0, 255, 127],
			steelblue: [70, 130, 180],
			tan: [210, 180, 140],
			teal: [0, 128, 128],
			thistle: [216, 191, 216],
			tomato: [255, 99, 71],
			turquoise: [64, 224, 208],
			violet: [238, 130, 238],
			wheat: [245, 222, 179],
			white: [255, 255, 255],
			whitesmoke: [245, 245, 245],
			yellow: [255, 255, 0],
			yellowgreen: [154, 205, 50],
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
                var reg = /([a-z]+)\s*\(([-0-9.]+)[ ,]*(?:([-0-9.]+)(?:[ ,]*([-0-9.]+))?)\)/g;
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
                                x: found[3] ? parseFloat(found[3]) : 0,
                                y: found[4] ? parseFloat(found[4]) : 0
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
	var getStyles = function(doc, tag, oldstyle){
		if(!oldstyle)oldstyle = {};
		var style = {};
		var inlineStyles = {}, tmp;

		if (tag.hasAttribute('style')) {
			var styleTag = tag.getAttribute('style');
			styleTag = styleTag.split(/[;:]/);
			for (var i = 0, _i = styleTag.length; i < _i; i += 2) {
				if (styleTag[i + 1]){
					var sTag = styleTag[i].trim();
					inlineStyles[styleTag[i].trim()] = styleTag[i + 1].trim();
				}
			}
		}


		if (inlineStyles['color'] || tag.hasAttribute('color')) {
			style.color = getColor(inlineStyles['color'] || tag.getAttribute('color'));
		}


		if(!style.stroke) style.stroke = {};
		if (inlineStyles.stroke || tag.hasAttribute('stroke')) {
			style.stroke.color = getColor(inlineStyles.stroke || tag.getAttribute('stroke'));
		}
		if((!style.stroke.color ||style.stroke.color =='inherit') && oldstyle.stroke && oldstyle.stroke.color){
			style.stroke.color = {};
			style.stroke.color.a = oldstyle.stroke.color.a;
			style.stroke.color.r = oldstyle.stroke.color.r;
			style.stroke.color.g = oldstyle.stroke.color.g;
			style.stroke.color.b = oldstyle.stroke.color.b;
		}

		// d
		if (inlineStyles['stroke-dasharray'] || tag.hasAttribute('stroke-dasharray')) {
			tmp = inlineStyles['stroke-dasharray'] || tag.getAttribute('stroke-dasharray');
			if(tmp !== 'inherit')
				style.stroke.dasharray = parseArray(tmp, /[0-9]+/g, parseInt);
		}
		if (inlineStyles['stroke-dashoffset'] || tag.hasAttribute('stroke-dashoffset')) {
			tmp = inlineStyles['stroke-dashoffset'] || tag.getAttribute('stroke-dashoffset');
			if(tmp !== 'inherit')
				style.stroke.dashoffset = parseInt(tmp);
		}

		// J
		if (inlineStyles['stroke-linecap'] || tag.hasAttribute('stroke-linecap')) {
			style.stroke.linecap = inlineStyles['stroke-linecap'] || tag.getAttribute('stroke-linecap');
		}
		if((!style.stroke.linecap || style.stroke.linecap=== 'inherit') && oldstyle.stroke && oldstyle.stroke.linecap){
			style.stroke.linecap = oldstyle.stroke.linecap;
		}
		// j
		if (inlineStyles['stroke-linejoin'] || tag.hasAttribute('stroke-linejoin')) {
			style.stroke.linejoin = inlineStyles['stroke-linejoin'] || tag.getAttribute('stroke-linejoin');
		}
		if((!style.stroke.linejoin || style.stroke.linejoin === 'inherit') && oldstyle.stroke && oldstyle.stroke.linejoin){
			style.stroke.linejoin = oldstyle.stroke.linejoin;
		}

		// M
		if (inlineStyles['stroke-miterlimit'] ||tag.hasAttribute('stroke-miterlimit')) {
			tmp = inlineStyles['stroke-miterlimit'] ||tag.getAttribute('stroke-miterlimit');
			if(tmp !== 'inherit'){
				style.stroke.miterlimit = parseFloat(tmp);
				if(style.stroke.miterlimit < 1)style.stroke.miterlimit  = 1;
			}
		}

		// CA
		if (inlineStyles['stroke-opacity'] || tag.hasAttribute('stroke-opacity')) {
			style.stroke.opacity = Math.max(0, Math.min(1, parseFloat(inlineStyles['stroke-opacity'] ||tag.getAttribute('stroke-opacity'))));
		}

		if (inlineStyles['stroke-width'] || tag.hasAttribute('stroke-width')) {
			style.stroke.width = parseFloat(inlineStyles['stroke-width'] || tag.getAttribute('stroke-width'));
		}else if(oldstyle.stroke && oldstyle.stroke.width != undef){
			style.stroke.width = oldstyle.stroke.width;
		}else{
			style.stroke.width = 1;
		}

		style.fill = {};
		if (inlineStyles['fill'] || tag.hasAttribute('fill')) {
			style.fill.color = getColor(inlineStyles['fill'] || tag.getAttribute('fill'));
		}else if(oldstyle.fill && oldstyle.fill.color != undef){
			style.fill.color = oldstyle.fill.color;
		}else{
			style.fill.color = getColor('black');
		}

		if(style.fill.color && style.fill.color.a < 1){
			style.fill.opacity = style.fill.color.a;
		}
		
		// ca
		if (inlineStyles['fill-opacity'] || tag.hasAttribute('fill-opacity')) {
			style.fill.opacity = inlineStyles['fill-opacity'] || tag.getAttribute('fill-opacity');
			if(!isNaN(style.fill.opacity))
				style.fill.opacity = Math.max(0, Math.min(1, parseFloat(style.fill.opacity)));
		}
		
		if(style.fill.opacity =='inherit' && oldstyle.fill && oldstyle.fill.opacity != undef){
			style.fill.opacity = oldstyle.fill.opacity;
		}
		
		if(style.fill.opacity == undef){
			style.fill.opacity = 1;
		}
		
		if (inlineStyles['fill-rule'] || tag.hasAttribute('fill-rule')) {
			style.fill.rule = (inlineStyles['fill-rule'] || tag.getAttribute('fill-rule'));
		}
		

		if(!style.font)style.font = {};
		if(oldstyle.font && oldstyle.font.size) style.font.size = oldstyle.font.size;
		if (inlineStyles['font-size'] || tag.hasAttribute('font-size')) {
			style.font.size = parseFloat(inlineStyles['font-size'] || tag.getAttribute('font-size'));
		}
		if(!style.font.size){
			style.font.size  = 12;
		}
		if(oldstyle.font && oldstyle.font.family) style.font.family = oldstyle.font.family;
		if (inlineStyles['font-family'] || tag.hasAttribute('font-family')) {
			var font_family = inlineStyles['font-family'] || tag.getAttribute('font-family'),
				fonts = doc.getFontList(),
				reg = /\s*(['"])?([^,]+)\1\s*,?/g,
				match;
			while(match = reg.exec(font_family)){
				if(fonts.hasOwnProperty(match[2])){
					style.font.family = match[2];
					break;
				}
			}
		}
		if(oldstyle.font && oldstyle.font.style) style.font.style = oldstyle.font.style;
		if (inlineStyles['font-weight'] || tag.hasAttribute('font-weight')) {
			var font_weight = inlineStyles['font-weight'] || tag.getAttribute('font-weight');
			switch(font_weight){
				case 'bold':
				case 'bolder':
				case '600':
				case '700':
				case '800':
				case '900':
					style.font.style = 'bold'
					break;
				case 'normal':
				case '400':
				case '500':
				case '100':
				case '200':
				case '300':
				case 'lighter':
					style.font.style = 'normal';
			}
		}

		if (inlineStyles['font-style'] || tag.hasAttribute('font-style')) {
			var font_style = inlineStyles['font-style'] || tag.getAttribute('font-style');
			switch(font_style){
				case 'italic':
				case 'oblique':
					if(style.font.style == 'bold')style.font.style = 'bolditalic';
					else style.font.style = 'italic'
					break;
			}
		}

		return style;
	}

	var setStyles = function(doc, styles, scale, isText){
		var style = '';
		var strokeOpac = null;
		var fillOpac = null;
		if (styles.stroke && styles.stroke.color && styles.stroke.color.a > 0 && !isText) {
			style += 'D';
			strokeOpac = styles.stroke.opacity || styles.stroke.color.a;
			doc.setDrawColor(styles.stroke.color.r, styles.stroke.color.g, styles.stroke.color.b);
			doc.setLineWidth(styles.stroke.width * scale[0]);
			doc.setLineCap(styles.stroke.linecap||0);
			doc.setLineJoin(styles.stroke.linejoin || 0);

		}

		if (styles.fill.color && styles.fill.color.a > 0  && !isText) {
			style += 'F';
			doc.setFillColor(styles.fill.color.r, styles.fill.color.g, styles.fill.color.b);
			fillOpac = styles.fill.opacity || styles.fill.color.a;
			if(styles.fill.rule && styles.fill.rule == 'evenodd'){
				if(style == 'DF') style = 'B*';
				else style = 'f*';
			}
		}

		if(isText){
			if(!styles.color){
				if(styles.fill && styles.fill.color)styles.color = styles.fill.color;
				else{styles.color = {r:0, g:0, b:0};}
			}
			doc.setTextColor(styles.color.r, styles.color.g, styles.color.b);
			var pdfFontSize = 16;
			if(styles.font && styles.font.size){
				pdfFontSize = styles.font.size;
			}
			pdfFontSize *= scale[0] * 3;
			doc.setFontSize(pdfFontSize);
			if(styles.font && styles.font.family){
				doc.setFont(styles.font.family, styles.font.style)
			}

		}

		//if(fillOpac && fillOpac < 1 || strokeOpac && strokeOpac < 1) 
		doc.setOpacity(fillOpac, strokeOpac);
		return style;
	}

	var parseArray = function(str, reg, parseVal){
		var arr = [], match;
		while(match = reg.exec(str)){
			if(parseVal){
				arr.push(parseVal(match[0]));
			}else{
				arr.push(match[0]);
			}
		}
		return arr;
	}

        var parseNodes = function(doc, tag, base, scale, transform, style) {
		if(!tag || tag.nodeType == 8/* #comment */ || tag.nodeType == 3/* #text */) return;

            transform = getTransforms(tag, transform);

            var _scale = [scale[0] * transform.scale.x, scale[1] * transform.scale.y];
            var setStyle;
            
            style = getStyles(doc, tag, style);

            var linesargs;
            if (tag.tagName) {
                switch (tag.tagName.toUpperCase()) {
                	case 'CIRCLE':
				var x = parseFloat(getAttribute(tag, 'cx', '0'));
				var y = parseFloat(getAttribute(tag, 'cy', '0'));
				var r = parseFloat(getAttribute(tag, 'r', '0'));
				if(r === 0) break;

				x = (x + transform.translate.x) * _scale[0] + base.x;
				y = (y + transform.translate.y) * _scale[1] + base.y;
				r = r * scale[0];
				setStyle = setStyle(doc, style, scale);
				doc.circle(x, y, r, setStyle);

				break;
			case 'ELLIPSE':
				var x = parseFloat(getAttribute(tag, 'cx', '0'));
				var y = parseFloat(getAttribute(tag, 'cy', '0'));
				var rx = parseFloat(getAttribute(tag, 'rx', '0'));
				var ry = parseFloat(getAttribute(tag, 'ry', '0'));
				if (rx === 0 || ry === 0) break;

				x = (x + transform.translate.x) * _scale[0] + base.x;
				y = (y + transform.translate.y) * _scale[1] + base.y;
				rx = rx * scale[0];
				ry = ry * scale[1];
				setStyle = setStyles(doc, style, scale);
				doc.ellipse(x, y, rx, ry, setStyle);

				break;
                    	case 'RECT':
	                        var x = parseFloat(getAttribute(tag, 'x', '0'));
	                        var y = parseFloat(getAttribute(tag, 'y', '0'));
	                        var rx = parseFloat(getAttribute(tag, 'rx', '0'));
	                        var ry = parseFloat(getAttribute(tag, 'ry', '0'));
	                        var width = parseFloat(getAttribute(tag, 'width', '0'));
	                        var height = parseFloat(getAttribute(tag, 'height', '0'));
	                        if (height === 0 || width === 0) break;
				
				x = (x + transform.translate.x) * _scale[0] + base.x;
				y = (y + transform.translate.y) * _scale[1] + base.y;
				rx = rx * scale[0];
				ry = ry * scale[1];
				width = width * scale[0];
				height = height * scale[1];

				setStyle = setStyles(doc, style, scale);
				if (rx === 0 || ry === 0) {
					doc.rect(x, y, width, height, setStyle);
				} else {
					doc.roundedRect(x, y, width, height, rx, ry, setStyle);
				}
				break;
			case 'PATH':
	                        var dStr = tag.getAttribute("d");
				setStyle = setStyles(doc, style, scale);

				if (setStyle == 'none' || setStyle == '') break;
				var paths = convertPathToPDFLinesArgs(dStr); //.split(' ') 
				var xy, path, close;
				for(var l=0,_l = paths.length; l<_l;l++){
					path = paths[l];
					xy = path.splice(0,1)[0];
					close = false;
					if(path[path.length-1] === 'z'){
						close = true;
						path.splice(path.length-1, 1);
					}
					doc.lines(
						path
						, (xy[0] + transform.translate.x) * _scale[0] + base.x
						, (xy[1] + transform.translate.y) * _scale[1] + base.y
						, _scale
						, l == _l-1? setStyle:null
						, close
					);

				}
                        break;
                    case 'LINE':
                    	setStyle = setStyles(doc, style, scale);
			var x1 = parseFloat(tag.getAttribute('x1')),
				y1 = parseFloat(tag.getAttribute('y1')),
				x2 = parseFloat(tag.getAttribute('x2')),
				y2 = parseFloat(tag.getAttribute('y2'));
			
			
			doc.lines(
				[[x2 - x1, y2 - y1]]
				, (x1 + transform.translate.x) * _scale[0] + base.x
				, (y1 + transform.translate.y) * _scale[1] + base.y
				, _scale
				, setStyle
			);
                        break;
			case 'POLYGON':
				var pointsArr = [];
				var pointsArrScaled = [];
				var points = tag.getAttribute('points');
				var reg = /(-?[0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?)(?:,\s*|\s+)(-?[0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?)/g;
				var match;
				var i=0;

				function doScale(x, y, transform, scale, base){
					return [(x + transform.translate.x) * scale[0] + base.x,
							(y + transform.translate.y) * scale[1] + base.y];
				}

				while(match = reg.exec(points)){
					pointsArr.push([parseFloat(match[1]), parseFloat(match[2])]);
					if(!pointsArrScaled.length){
						pointsArrScaled.push(doScale(pointsArr[i][0],pointsArr[i][1],transform, _scale, base));
					}else{
						pointsArrScaled.push(doScale(pointsArr[i][0] - pointsArr[i-1][0],pointsArr[i][1] - pointsArr[i-1][1],transform, _scale, base));
					}
					i++;
				}

				setStyle = setStyles(doc, style, scale);
				var xy = pointsArrScaled.splice(0,1);
				doc.lines(xy[0], xy[1], pointsArrScaled, _scale, setStyle);


				break;
                    case 'TEXT':
                        if (!tag.textContent || tag.textContent.length === 0) break;

                        var rotate;
                        if (transform.rotate.angle != 0) {
                            rotate = transform.rotate;
                            rotate.x = (rotate.x + transform.translate.x) * _scale[0] + base.x;
                            rotate.y = (rotate.y + transform.translate.y) * _scale[1] + base.y;
                        }

			setStyle = setStyles(doc, style, scale, true);

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

                        if (tag.childNodes.length > 0) {
                            for (var c = 0, _c = tag.childNodes.length; c < _c; c++) {
                                var cn = tag.childNodes[c];
                                if (cn.nodeType === 3) {
                                    // #text
                                    doc.text(
                                        cn.data, (xPos + transform.translate.x) * _scale[0] + base.x, (yPos + transform.translate.y) * _scale[1] + base.y,
                                        align,
                                        !rotate? 0: rotate.angle
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
                                    doc.text(cn.innerHTML, 
					(cx + transform.translate.x) * _scale[0] + base.x,
					(cy + transform.translate.y) * _scale[1] + base.y,
					align,
					!rotate? 0: rotate.angle
                                    );
                                    xPos += doc.getStringUnitWidth(cn.innerHTML) / _scale[0];
                                }
                            }

                        }

                        break;
                    case 'G':
		    case 'SVG':
                        var i, l, tmp, items = tag.childNodes
                        for (i = 0, l = items.length; i < l; i++) {
                            tmp = items[i]
                            parseNodes(doc, tmp, base, _scale, transform, style);
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

        var i, l, tmp, linesargs, items = svgnode.childNodes, baseStyle = getStyles(this, svgnode);
        for (i = 0, l = items.length; i < l; i++) {
            tmp = items[i];
            if (tmp.nodeType === 3) continue;

            parseNodes(this, tmp, {
                x: x,
                y: y
            }, scale, {}, baseStyle);
        }


        // clean up
        // workernode.parentNode.removeChild(workernode)

        return this
    }

})(jsPDF.API);
