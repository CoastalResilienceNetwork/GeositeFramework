$(document).ready(function() {
	function resizeMap(){
		var sideWid 	= $('.sidebar').width(),
			fullWid		= $('.content').width(),
			mapWid		= fullWid - sideWid;
		
		$('.map').width(mapWid);
	}
	
	resizeMap();
	$(window).resize(resizeMap);
	
});
