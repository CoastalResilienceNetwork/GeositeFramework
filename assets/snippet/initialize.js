$( document ).ready(function() {
	// At startup, set selected value text for any inputs set as selected in HTML
	$( '.toggle-btn input' ).each(function(i,v){
		if( $(v)[0].checked ){
			$('#' + $(v)[0].id).parent().next().find("span").html($(v)[0].value)
		}
	});
	// Set selected value text for button clicks
	$( '.toggle-btn input' ).click(function(c){
		$('#' + c.target.id ).parent().next().find("span").html(c.target.value)
	});
	// Handle Show HTML button clicks
	$( '.sh' ).click(function(c){
		if( c.target.innerHTML.slice(0,4) == "Show" ){
			$(c.target).next().slideDown()
			$(c.target).html("Hide HTML")
			if (c.target.id == "sc"){
				$(c.target).html("Hide Code")
			}
			if (c.target.id == "tb"){
				$(c.target).html("Hide CSS")
			}
		}else{
			$(c.target).next().slideUp()
			$(c.target).html("Show HTML")
			if (c.target.id == "sc"){
				$(c.target).html("Show Code")
			}
			if (c.target.id == "tb"){
				$(c.target).html("Show CSS")
			}
		}
	});
	//layout range slider
	$('#rslider').slider({range:true, min:0, max:100, values:[25,75],
		change:function(event,ui){
			// called at end of slide. use change to ask server for data
		},slide:function(event,ui){
			$('#rslider').next().find('span').each(function(i,v){
				$(v).html(ui.values[i])
			})
		}
	})
	//accrodion
	$( "#accord" ).accordion({heightStyle: "fill"});
	$( "#accord > h3" ).addClass("accord-header");
	$( "#accord > div" ).addClass("accord-body");
	//range slider
	$('#rsldr').slider({range:true, min:0, max:100, values:[25,75],
		change:function(event,ui){
			// called at end of slide. use change to ask server for data
		},slide:function(event,ui){
			$('#rsldr').next().find('span').each(function(i,v){
				$(v).html(ui.values[i])
			})
		}
	})
	//chosen
	$("#chosenSingle").chosen({allow_single_deselect:true, width:"155px"}).change(function(c){
		var v = c.target.value;
		// check for a deselect
		if (v.length == 0){
			v = "none";
		}
		$('#' + c.target.id ).parent().next().find("span").html(v)
	});
	$("#chosenMultiple").chosen({width:"200px"}).change(function(c){
		var v = $("#chosenMultiple").val();
		v = "[" + v.toString() + "]";
		$('#' + c.target.id ).parent().next().find("span").html(v)
	});
	//slider
	$("#sldr").slider({ min: 0, max: 5, range: false, values: [1] })
		.slider("pips", { rest: "label"})
		.slider("float");
	//tooltip
	$('[data-toggle="tooltip"]').tooltip({container:'body'});
	//clipboard
	var copyCode = new Clipboard('.copy-button', {
	    target: function(trigger) {
	        return trigger.nextElementSibling;
	    }
	});
	copyCode.on('success', function(event) {
	    event.clearSelection();
	    event.trigger.textContent = 'Copied';
	    window.setTimeout(function() {
	        event.trigger.textContent = 'Copy';
	    }, 2000);
	});
	copyCode.on('error', function(event) {
	    event.trigger.textContent = 'Press "Ctrl + C" to copy';
	    window.setTimeout(function() {
	        event.trigger.textContent = 'Copy';
	    }, 2000);
	});
});
