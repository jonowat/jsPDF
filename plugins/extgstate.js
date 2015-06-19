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
	
	

})(jsPDF.API);
