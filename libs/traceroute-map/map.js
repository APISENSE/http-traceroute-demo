let url = "https://honeycomb.apisense.io/api/v1/crop/oPNPvJbwJ5Sv9qrBGZJ1/data";

let map;
let lastInfoWindow;

let paris = {
    lat: 48.8534100,
    lng: 2.3488000
};

/**
 * GeoLoc style+behavior
 * @param {[type]} controlDiv Div to insert the element
 * @param {[type]} map        Instance of Google Map
 */
function GeolocControl(controlDiv, map) {
    controlDiv.style.padding = '0px 0px 5px 32px';

    // Set CSS for the control border
    let controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.border = '1px solid #ff8533';
    controlUI.style.borderRadius = '15px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Find me';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    let controlText = document.createElement('div');
    controlText.style.color = '#ff8533';
    controlText.style.fontSize = '11px';
    controlText.style.padding = '3px 6px';
    controlText.innerHTML = '<i class="fa fa-location-arrow"></i>';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Paris
    google.maps.event.addDomListener(controlUI, 'click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                let pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                map.setCenter(pos);
            }, function () {
                handleNoGeolocation(true);
            });
        } else {
            // Browser doesn't support Geolocation
            handleNoGeolocation(false);
        }

        map.setCenter(new google.maps.LatLng(paris.lat, paris.lng));
    });
}

function handleNoGeolocation(errorFlag) {
    let content = "";
    if (errorFlag) {
        content = 'Error: The Geolocation service failed.';
    } else {
        content = 'Error: Your browser doesn\'t support geolocation.';
    }

    let options = {
        map: map,
        position: new google.maps.LatLng(paris.lat, paris.lng),
        content: content
    };

    map.setCenter(options.position);
}

/**
 * Initialize Google Maps
 */
function initialize() {

    let mapOptions = {
        zoom: 4,
        scrollwheel: true,
        center: new google.maps.LatLng(paris.lat, paris.lng)
    };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    let homeControlDiv = document.createElement('div');
    new GeolocControl(homeControlDiv, map);

    homeControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(homeControlDiv);

    google.maps.event.addListener(map, 'click', function () {
        if (lastInfoWindow) lastInfoWindow.close();
    });
}

/**
 * Load Google Maps scripts
 */
function loadScript() {
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&' +
        'callback=initialize&libraries=visualization';
    document.body.appendChild(script);

    let script_cluster = document.createElement('script');
    script_cluster.type = 'text/javascript';
    script_cluster.src = 'https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/src/markerclusterer.js';
    document.body.appendChild(script_cluster);
}

window.onload = loadScript;