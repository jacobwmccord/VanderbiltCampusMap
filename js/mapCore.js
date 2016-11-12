
function redirectMobile(){
	window.location = "./vanderbilt_campus_map_mobile.html";
}

function redirectDesktop(){
	window.location = "./vanderbilt_campus_map.html";
}

var overlayOn = false;
		
var content = document.getElementById('box-content');
var popup = new ol.Overlay(({
	element: document.getElementById('box'),		// Creates the popup to be used later
	autoPan: true,
	autoPanAnimation: {
		duration: 250
	}
}));
		
var view = new ol.View({
	center: ol.proj.transform(
		[-86.799013, 36.143116], 'EPSG:4326', 'EPSG:3857'),
	zoom: 16,
	minZoom: 14,
	maxZoom: 19});
		
var map = new ol.Map({
	overlays: [popup],
	target: 'map', 
	view: view,
	controls: []
});
		
var tileLayer = new ol.layer.Tile({
	source: new ol.source.XYZ({
		url:'tiles/{z}/{x}/{y}.png'
	})
});	// Tile layer
		
map.addLayer(tileLayer);
		
addImageOverlays();	// this function goes through all images and creates a layer for each of them
		
function addImageOverlays(){
	for(var i = 0; i < 7; i ++){
		var img = new ol.layer.Image({
			name:'img'+i,
			source: new ol.source.ImageStatic({
				url:'assets/images/map'+i+'.png',
				imageSize: [2200,1700],
				imageExtent: ol.proj.transformExtent([ -86.815196, 36.150869, -86.794034, 36.136541], 'EPSG:4326', 'EPSG:3857')
			})
		});
		map.addLayer(img);
		img.setVisible(false);
	}
}
		
var polystyle = function() {
	return function(feature){	
		var style = new ol.style.Style({		// Controls polygon styling
			fill: new ol.style.Fill({
				color: '#ffcc00'
			}),
			stroke: new ol.style.Stroke({
				color: '#ffffff',
				width: 2.0,
				lineJoin: 'round'
			})
		})
		var textstyle = new ol.style.Style({	// Controls labeling styling
			text: new ol.style.Text({
				font: 'bold 12px Georgia, serif',
				text: text(feature),
				scale: 1.0,
				fill: new ol.style.Fill({
					color: '#000000'
				}),
				stroke: new ol.style.Stroke({
					color: '#ffffff',
					width: 6.0,
					lineJoin: 'round'
				})
			}),
			geometry: function(feature){
				var inPoint;
				if (feature.getGeometry().getType() == 'MultiPolygon')
					inPoint = getMaxPoly(feature.getGeometry().getPolygons()).getInteriorPoint();
				else if (feature.getGeometry().getType() == 'MultiPolygon')
					inPoint = feature.getGeometry().getInteriorPoint();
							
				return inPoint;		// selects a point in the largest polygon to prevent repeated labeling
									// of multi-part polygons
			}
		})
		return [style, textstyle];
	};
};
		
function getMaxPoly(polygons){	// returns largest polygon of a set of polygons (helper for labeling)
	var poly = [];
		
	for (var i = 0; i < polygons.length; i++)
		poly.push({polygon: polygons[i], area: polygons[i].getArea() });
		
	poly.sort(function(a,b){ return a.area - b.area });
	return poly[poly.length - 1].polygon;
}
		
var text = function(feature){	// controls label text
		
	// stuff that doesn't fit into the basic capitalization rules
	var exceptionsToRule = ['II', 'III', 'IV', 'SC', 'NPHC', 'KC', 'MRB']
			
	if((view.getZoom() > 17 || feature.get('FORCE_LABEL') == 'YES') && feature.get('BLDG_DESCRIPTION')){
		var tex = feature.get('BLDG_DESCRIPTION');
		tex = tex.split(/[- \/]/);
		t = '';
		for(s in tex)
			if(exceptionsToRule.indexOf(tex[s]) == -1)
				t = t + (tex[s].charAt(0) + tex[s].substring(1).toLowerCase() + ' ');
			else
				t = t + tex[s] + ' ';
	}else{
		var t = '';
	}
	return t;
};

var vectorLayer = new ol.layer.Vector({	// loads facilities onto the map
	source: new ol.source.Vector({	
		url: 'Buildings.geojson',
		format: new ol.format.GeoJSON({
			defaultDataProjection :'EPSG:4326', 
			projection: 'EPSG:3857'
		
		})			
	}),											
	style: polystyle()
});

map.addLayer(vectorLayer);

var select = new ol.interaction.Select({	// Adds the ability to select polygons
	condition: ol.events.condition.click,
	style: new ol.style.Style({
		fill: new ol.style.Fill({
			color: 'rgba(140, 219, 255, 0.5)'
		}),
		stroke: new ol.style.Stroke({
			color: 'rgba(34, 179, 236, 1.0)',
			width: '4.0'
		})
	})	
});
map.addInteraction(select);

select.getFeatures().on('change:length', function(e) {	// Creates and destroys popups on select
	if (e.target.getArray().length === 0) {
		popup.setPosition(undefined);
		closePanel();
	} else {
		var feature = e.target.item(0);
		var extent = feature.getGeometry().getExtent();
		var coordinate = ol.extent.getCenter(extent);
		content.innerHTML = feature.get('BLDG_DESCRIPTION');// + '<button id="go" style="width:100%" onclick="moreInfo()">LEARN MORE</button>';
		moreInfo();
		popup.setPosition(coordinate);
	}
});

function moreInfo(){
	var currSel = select.getFeatures().item(0);
	document.getElementById('building-name').innerHTML = currSel.get('BLDG_DESCRIPTION');
	document.getElementById('building-info').innerHTML = currSel.get('BLDG_INFORMATION');
	document.getElementById('adrline1').innerHTML = currSel.get('ADDR1');
	if(currSel.get('BLDG_CITY') && currSel.get('BLDG_ZIP'))
		document.getElementById('adrline2').innerHTML = currSel.get('BLDG_CITY') + ' TN ' + currSel.get('BLDG_ZIP');
	else
		document.getElementById('adrline2').innerHTML = '';

	document.getElementById('building-box').style.width = '250px';
}

function closePanel(){
	document.getElementById('building-box').style.width = '0px';
}

function search(){

	if(!overlayOn){
									// Simple search function
		select.getFeatures().clear();
		
		var src = vectorLayer.getSource();
		var features = src.getFeatures();
		
		var term = document.getElementById('search').value;
		var a = [];
		
		temp = find(features, term);	// first tries to find the term directly
		for(r in temp)
			a.push(temp[r]);
			
		if (a.length == 0 && term.split(' ').length > 1){	// if nothing is found, we try again
			for(s in term.split(' '))						// after splitting the word (maybe a word was
				temp = find(features, s);					// spelled incorrectly)
				for(r in temp)
					a.push(temp[r]);
		}
		
		if(a.length == 0){
			document.getElementById('results').innerHTML = 'No results for \"' + document.getElementById('search').value +'\"';
			document.getElementById('search').value = '';
		}else{
			document.getElementById('results').innerHTML = 'Possible results for \"' + document.getElementById('search').value +'\":</br>';
			document.getElementById('search').value = '';
			
			for(i in a)
				document.getElementById('results').innerHTML += '<button type="reslink" id="reslink" onclick=\"resClick(\''+a[i].get('BLDG_DESCRIPTION')+'\')\">'+a[i].get('BLDG_DESCRIPTION') + '</button></br>';

			select.getFeatures().push(a[0]);
			var extent = a[0].getGeometry().getExtent();
			var coordinate = ol.extent.getCenter(extent);
			view.setCenter(coordinate);
			view.setZoom(17);				// centers the map on the building
		}
		
	}else{
		document.getElementById('search').value = '';
		document.getElementById('results').innerHTML = 'Switch to normal view to search!';
	}
	
	document.getElementById('search').blur();
	
};

function find(features, search_term){
	results = [];
	
	if(search_term){
		var regEx = new RegExp(search_term.toLowerCase());
		
		for (f in features){
			buildingDesc = features[f].get('BLDG_DESCRIPTION');
			
			if(buildingDesc && regEx.test(buildingDesc.toLowerCase()))
				results.push(features[f]);
		}
				
		if (results.length == 0){
			for(f in features){
				buildingAttr = features[f].get('BLDG_INFORMATION');
				
				if(buildingAttr && regEx.test(buildingAttr.toLowerCase()))
					results.push(features[f]);
			}
		}
	}
	
	return results;
};

function resClick(e)	// selects features when a button in the results list is clicked, and centers view
{
	select.getFeatures().clear();
	
	var src = vectorLayer.getSource();
	var features = src.getFeatures();
	
	for(var f=0;f<features.length;f++) {
	  if(e == features[f].get('BLDG_DESCRIPTION')){
		select.getFeatures().push(features[f]);
		var extent = features[f].getGeometry().getExtent();
		var coordinate = ol.extent.getCenter(extent);
		view.setCenter(coordinate);
		view.setZoom(17);	
	  }
	};	
}			

function setOverlay()	// controls layer visibility
{
	var e = document.getElementById("layercontrol").value;
	var layerColl = map.getLayers();
	
	var a = false;
	
	for(var i = 1; i < layerColl.getLength(); i++)
	{
		if(layerColl.item(i).get('name') == e){
			layerColl.item(i).setVisible(true);
			a = true;
		} else {
			if(layerColl.item(i).get('name') != 'vector')
				layerColl.item(i).setVisible(false);
		}
	}

	if(a){
		document.getElementById('search').disabled = true;
		document.getElementById('results').innerHTML = 'Switch to normal view to search!';
		select.getFeatures().clear();
		
		tileLayer.setVisible(false);
		vectorLayer.setVisible(false);
		overlayOn = true;
		
		view.setCenter(ol.proj.transform([-86.799013, 36.139116], 'EPSG:4326', 'EPSG:3857'));
		view.setZoom(15);
	} else {
		document.getElementById('search').disabled = false;
		document.getElementById('results').innerHTML = 'Results will appear here after searching . . .';
	
		tileLayer.setVisible(true);
		vectorLayer.setVisible(true);
		overlayOn = false;
	
		view.setCenter(ol.proj.transform([-86.799013, 36.143116], 'EPSG:4326', 'EPSG:3857'));
		view.setZoom(17);
	}
}