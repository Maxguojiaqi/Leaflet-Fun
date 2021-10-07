// popup class defined at the begining of the app and being used later
function Popup(properties, attribute, layer, radius){
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.year = attribute.split("_")[1];
    this.income = this.properties[attribute];
    this.content = "<p><b>City:</b> " + this.properties.PlaceName + "</p><p><b>Family average Income in " + this.year + ":</b> " + this.income + " CAD</p>";

    this.bindToLayer = function(){
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0,-radius)
        });
    };
};
//function to instantiate the Leaflet map with custom basemap
function createMap(){
    //create the map
    let map = L.map('map', {
        center: [ 53, -97.2923],
        zoom: 4
    });

    //add basemap tile layer from mapbox studio
    L.tileLayer('https://api.mapbox.com/styles/v1/maxguo/ckufxs8j32zgi18tlv2ojvegw/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWF4Z3VvIiwiYSI6ImNrbW1sYW4wczFscmsydW1pbWlxMGw4ZjIifQ.UZrtXpHxPjE88rcczsrcng', {
        attribution: '&copy; <a href="https://www.mapbox.com/">MapBox - MaxGuo Design Studio</a>'
    }).addTo(map);

    //call getData function to get all the feature information
    getData(map);

    // add custom search 
    map.addControl(new L.Control.Search({
        url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
        jsonpParam: 'json_callback',
        propertyName: 'display_name',
        propertyLoc: ['lat','lon'],
        markerLocation: true,
        autoType: false,
        autoCollapse: true,
        minLength: 2,
        zoom:16
    }));
};

function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

 //function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){

    let attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    let options = {
        fillColor: "#FF0000",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    };

    //For each feature, determine its value for the selected attribute
    let attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    let layer = L.circleMarker(latlng, options);
    let popup = new Popup(feature.properties, attribute, layer, options.radius)
    popup.bindToLayer();
    return layer;
};

function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            let props = layer.feature.properties;
    
            //update each feature's radius based on new attribute values
            let radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            let popup = new Popup(props, attribute, layer, radius)
            popup.bindToLayer();
        };
    });
};

function updateLegend(map, attribute){
    let year = attribute.split("_")[1];
    document.getElementById('legend').innerHTML = `The Average Household income in ${year}`;
      //get the max, mean, and min values as an object
      let circleValues = getCircleValues(map, attribute);

      for (let key in circleValues){
        //get the radius
        let radius = calcPropRadius(circleValues[key]);

        $('#'+key).attr({
            cy: 65 - radius,
            r: radius
        });

        $('#'+key+'-text').text(Math.round(circleValues[key])/1000 + " k CAD");
    };

};

function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    let min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            let attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    let mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};


function processData(data){
    //empty array to hold attributes
    let attributes = [];

    //properties of the first feature in the dataset
    let properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (let attribute in properties){
        //only take attributes with income values
        if (attribute.indexOf("Income") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    let scaleFactor = 0.04;
    //area based on attribute value and scale factor, minus 60000 to make difference more obvious
    let area = (attValue - 60000) * scaleFactor;
    //radius calculated based on area
    let radius = Math.sqrt(area/Math.PI);

    return radius;
};

// Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data.json", {
        dataType: "json",
        success: function(response){
            //call function to create proportional symbols
            let attributes = processData(response)

            // create symbol, sequence control and legend
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
            updateLegend(map, attributes[$('.range-slider').val()]);
        }
    });
};

function createSequenceControls(map, attributes){   
    let SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            let container = L.DomUtil.create('div', 'sequence-control-container');

            //add skip buttons
            $(container).append('<img class="skip" id="reverse" src="left-arrow.png">');
            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');
            $(container).append('<img class="skip" id="forward" src="right-arrow.png">');

            //kill dragging event
            $(container).on('mouseover', function(e){
                map.dragging.disable();
            });
            //kill double click event
            $(container).on('dblclick', function(e){
                L.DomEvent.stopPropagation(e);
            });
            $(container).on('mouseout', function(e){
                map.dragging.enable();
            });

            return container;
        }
    })
    map.addControl(new SequenceControl());

    // set the specs of the range slider 
    $('.range-slider').attr({
        max: 10,
        min: 0,
        value: 0,
        step: 1
    });

    // the logic for the slider 
    $('.skip').click(function(){
        //get the old index value
        let index = $('.range-slider').val();

        if ($(this).attr('id') == 'forward'){
            index++;
            index = index > 10 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            index = index < 0 ? 10 : index;
        };
        $('.range-slider').val(index);
        // change symbol size and legend value when button clicked 
        updatePropSymbols(map, attributes[index]);
        updateLegend(map, attributes[index]);
    });
        // change symbol size and legend value when slider dragged 
    $('.range-slider').on("input", function(){
        updatePropSymbols(map, attributes[$('.range-slider').val()]);
        updateLegend(map, attributes[$('.range-slider').val()]);
      });
};

function createLegend(map, attributes){
    let LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function () {
            // create the control container with a particular class name
            let container = L.DomUtil.create('div', 'legend-control-container');
            // legend creation
            $(container).append(`<p style="line-height=100%;" id="legend" >The Average Household income in ${attributes[$('.range-slider').val()].split("_")[1]}</p>`);
            let svg = '<svg id="attribute-legend" width="160px" height="80px">';

        //array of circle names to base loop on
        let circles = {
            max: 20,
            mean: 40,
            min: 60
        };

        //Step 2: loop to add each circle and text to svg string
        for (let circle in circles){
            //circle string
            svg += '<circle class="legend-circle" id="' + circle + 
            '" fill="#FF0000" fill-opacity="0.8" stroke="#000000" cx="33"/>';

            //text string
            svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
        };

        //close svg string
        svg += "</svg>";
        //add attribute legend svg to container
        $(container).append(svg);

            return container;
        }
    });
    // add legend to the map
    map.addControl(new LegendControl());
};

$(document).ready(createMap);