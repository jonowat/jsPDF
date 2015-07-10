/**
 * jsPDF ExtGState
 * Copyright (c) 2015 Jono Watkins, https://github.com/jonowat/
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */

(function(jsPDFAPI) {
jsPDFAPI.setOpacity = function(fillOpacity, strokeOpacity){
			var key, dict, name, id;
			if(fillOpacity === null && strokeOpacity === null) return;
			if(fillOpacity !== null){
				fillOpacity = Math.max(0, Math.min(1, fillOpacity));
			}else{
				fillOpacity = 1;
			}
			if(strokeOpacity !== null){
				strokeOpacity = Math.max(0, Math.min(1, strokeOpacity));
			}else{
				strokeOpacity = 1;
			}

			if(!this.internal.collections.opacities)this.internal.collections.opacities={};
			var opacities = this.internal.collections.opacities;
			key = fillOpacity+'_'+strokeOpacity;

			if(opacities[key]){
				this.internal.write('/'+opacities[key].name+' gs');
			}else{
				dict = '<</Type /ExtGState';
				if(fillOpacity !== null){
					dict += '/ca '+fillOpacity;
				}
				if(strokeOpacity !== null){
					dict += '/CA '+strokeOpacity;
				}
				dict += '>>';
				var extGstate = this.setExtGState(dict);
				opacities[key] = extGstate;
			}
		};
		
		jsPDFAPI.setExtGState = function(dict){
			var name, id;
			if(!this.internal.collections.ExtGState)this.internal.collections.ExtGState={};
			id = 0;
			name = "Gs"+id;
			while(this.internal.collections.ExtGState.hasOwnProperty(name)){
				name = "Gs"+(++id);
			}
				
			this.internal.events.subscribe('putResources', function () {
				var objId = this.internal.newObject(),
					this.internal.write(dict, "endobj");
				this.internal.collections.ExtGState[name].objectNumber = objId;
			});

			this.internal.events.subscribe('putResourceDictionary', function(){
				var hasgState = false;
				for(var state in this.internal.collections.ExtGState){
					if(this.internal.collections.ExtGState.hasOwnProperty(state)){
						if(this.internal.collections.ExtGState[state].addedToResources)continue;
						if(!hasgState){
							hasgState = true;
							this.internal.write('/ExtGState<<');
						}
						this.internal.write('/'+state +" " +this.internal.collections.ExtGState[state].objectNumber+' 0 R');
						this.internal.collections.ExtGState[state].addedToResources = true;
					}
				}
				if(hasgState)this.internal.write('>>');
			});

			this.internal.collections.ExtGState[name] = {dict:dict};
			this.internal.write('/'+name+' gs');
			return {name: name, dict:dict};
		};
	
	
	/**
	* Restores the entire graphics state to its former value by popping it from the stack.
	* 4.3.1 Graphics State Stack (PDF Reference V1.7)
	*
	* @function
	* @returns {jsPDF}
	* @methodOf jsPDF#
	* @name saveTransform
	*/
	jsPDFAPI.resetTransform = function(){
		this.internal.write('Q');
		if(!this.internal.collections.TransformStack)this.internal.collections.TransformStack = [];
		this.internal.collections.CurrentTransform = this.internal.collections.TransformStack.pop();
	}
	
	/**
	* Pushes a copy of the entire graphics state onto the stack
	* 4.3.1 Graphics State Stack (PDF Reference V1.7)
	*
	* @function
	* @returns {jsPDF}
	* @methodOf jsPDF#
	* @name saveTransform
	*/
	
	jsPDFAPI.saveTransform = function(){
		this.internal.write('q');
		this.getCTM();
		this.internal.collections.TransformStack.push(this.internal.collections.CurrentTransform.slice());	
	}
	
	/**
	 * Sets transform by matrix 
	 * Matrix equivalent:
	 * | a c e |
	 * | b d f |
	 * | 0 0 1 |
	 *
	 * Stores current combined transformation matrix
	 *
	 * @example .setTransform(2, 0, 0, 2, 210, 110) 
	 * @param {Number} a matrix value
	 * @param {Number} b matrix value
	 * @param {Number} c matrix value
	 * @param {Number} d matrix value
	 * @param {Number} e matrix value
	 * @param {Number} f matrix value
	 * 
	 * @function
	 * @returns {jsPDF}
	 * @methodOf jsPDF#
	 * @name setTransform
	 */
	jsPDFAPI.setTransform = function(a, b, c, d, e, f){
		if(typeof f === "undefined") f = 0;
		if(typeof e === "undefined") e = 0;
		if(typeof d === "undefined") d = 0;
		if(typeof c === "undefined") c = 0;
		if(typeof b === "undefined") b = 0;
		if(typeof a === "undefined") a = 0;
		
		var m = this.getCTM();
		m[0] = m[0]*a + m[2]*b;
		m[1] = m[1]*a + m[3]*b;
		m[2] = m[0]*c + m[2]*d;
		m[3] = m[1]*c + m[3]*d;
		m[4] = m[0]*e + m[2]*f + m[4];
		m[5] = m[1]*e + m[3]*f + m[5];
		
		
		this.internal.write(
			this.ToFixed(a, 5), 
			this.ToFixed(b, 5), 
			this.ToFixed(c, 5), 
			this.ToFixed(d, 5), 
			this.ToFixed(e * this.internal.scaleFactor, 5), 
			this.ToFixed(f * this.internal.scaleFactor, 5),
			'cm');
	}
	
	/**
	* Gets current Transformation Matrix
	*
	*
	* @function
	* @returns current Transformation Matrix array
	* @methodOf jsPDF#
	* @name setTransform
	*/
	jsPDFAPI.getCTM = function(){
		if(!this.internal.collections.TransformStack)this.internal.collections.TransformStack = [];
		if(!this.internal.collections.CurrentTransform)this.internal.collections.CurrentTransform = [1, 0, 0, 1, 0, 0];
		return this.internal.collections.CurrentTransform;
	}
	
	jsPDFAPI.ToFixed = function(num, dec){
			num =num.toFixed(dec);
			return parseFloat(num).toString();
		}
	
	/**
		 * Sets Translate by x and y
		 * @example .setTranslate(212, 110) 
		 * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
		 * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
		 * 
		 * @function
		 * @returns {jsPDF}
		 * @methodOf jsPDF#
		 * @name setTranslate
		 */
	jsPDFAPI.setTranslate = function(x, y){
		this.setTransform(1, 0, 0, 1, x, -y);
		return this;
	}
	
	jsPDFAPI.setRotate = function(angle, x, y){
		if(!x)x=0;
		if(!y)y=0;
		var rad = angle * Math.PI / 180,
			cos = Math.cos(rad),
			sin = Math.sin(rad);
		
		this.setTransform(1, 0, 0, 1, 0, this.internal.pageSize.height);
		
		if(x || y){
			this.setTranslate(x, y);
		}

		this.setTransform(cos, sin, -sin, cos, 0, 0);
		
		if(x || y){
			this.setTranslate(-x, -y);
		}
		
		this.setTransform(1, 0, 0, 1, 0, -this.internal.pageSize.height);
		
		return this;
	}
	
	jsPDFAPI.setScale = function(sX, sY){
		if(arguments.length == 1){
			sY = sX;
		}
		
		var offset = - this.internal.pageSize.height * (1 - sY);
		this.setTranslate(0, offset);
		this.setTransform(sX, 0, 0, sY, 0, 0);
		
		return this;
	}
	
	jsPDFAPI.setSkew = function(aX, aY){
		var radX = (-aX||0) * Math.PI / 180,
			radY = (-aY||0) * Math.PI / 180,
			tanX = Math.tan(radX),
			tanY = Math.tan(radY);
		this.setTransform(1, 0, 0, 1, 0, this.internal.pageSize.height);
		this.setTransform(1, tanX, tanY, 1, 0, 0);
		this.setTransform(1, 0, 0, 1, 0, -this.internal.pageSize.height);
	}
	
	jsPDFAPI.outputDict = function(obj){
		var content = '';
		if(obj === null){
			content = 'null';
		}else if(obj === true){ 
			content = 'true';
		}else if(obj === false){ 
			content = 'false';
		}else if(!isNaN(obj)){
			content += ' '+obj;
		}else if(typeof obj == 'string'){
			content += '('+pdfEscape(obj)+')';
		}else if(Array.isArray(obj)){
			content +='[';
			for(var i=0,_i=obj.length;i<_i;i++){
				if(i>0)content+=' ';
				content += this.outputDict(obj[i]);
			}
			content+=']';
		}else if(obj instanceof this.Reference){
			content += ''+obj.toString();
		}else if(obj instanceof this.Name){
			content += '/'+obj.toString();
		}else if(typeof obj == 'object'){
			content += '<<';
			var key;
			for(key in obj){
				if(obj.hasOwnProperty(key)){
					content += '/'+key+' '+this.outputDict(obj[key]);
				}
			}
			content += '>>';
		}
		return content;
	};
	

})(jsPDF.API);
