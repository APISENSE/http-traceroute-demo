/**
 * Create a Google Map handling traceroutes data from APISENSE.
 *
 * The color on the map are mapped onto the ping result
 * where 0 will be displayed in green and 1000+ in red.
 *
 * Please ensure to load Google Map API before initializing this class:
 * <script src="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=visualization"></script>
 * <script src="https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/src/markerclusterer.js"></script>
 */
class TracerouteMap {
    constructor(element) {
        this.configuration = {
            strokeWeight: 2,
            strokeOpacity: 0.6,
            loadingElement: $("#loading-data")
        };
        this.mapOptions = {
            zoom: 4,
            scrollwheel: true,
            center: new google.maps.LatLng(48.8534100, 2.3488000)
        };
        this._mapElement = element;
        this._lastInfoWindow = undefined;
        this._usersLocations = [];
        this._markers = [];
        this._lines = [];
        this._colors = {};
        this.reloadGoogleMap()
    }

    /**
     * Reload the Google Map instance with the new configuration.
     */
    reloadGoogleMap() {
        this._map = this._initializeUnderlying();
    }

    /**
     * Initialize Google Maps.
     *
     * @return {google.maps.Map} The underlying google Map.
     * @private
     */
    _initializeUnderlying() {
        let map = new google.maps.Map(this._mapElement, this.mapOptions);

        $(".close-alert").click(function () {
            $(".alert").hide();
        });

        let homeControlDiv = document.createElement('div');
        this._geolocControl(homeControlDiv, map);

        homeControlDiv.index = 1;
        map.controls[google.maps.ControlPosition.LEFT_TOP].push(homeControlDiv);

        google.maps.event.addListener(map, 'click', function () {
            if (this._lastInfoWindow) {
                this._lastInfoWindow.close();
            }
        });

        return map;
    }

    /**
     * GeoLoc style+behavior.
     *
     * @param {[type]} controlDiv Div to insert the element
     * @param {[type]} map        Instance of Google Map
     * @private
     */
    _geolocControl(controlDiv, map) {
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
            map.setCenter(new google.maps.LatLng(paris.lat, paris.lng));
        });
    }

    /**
     * Reset the map to show nothing.
     * @private
     */
    _clearMap() {
        for (let i = 0; i < this._markers.length; i++) {
            this._markers[i].setMap(null);
        }
        this._markers = [];

        for (let i = 0; i < this._lines.length; i++) {
            this._lines[i].setMap(null);
        }
        this._lines = [];

        this._usersLocations = [];
        this._colors = {};
    }

    /**
     * Plot the given traceroute data on the map.
     *
     * @param data The data to plot
     */
    plotData(data) {
        this._clearMap();
        let that = this;

        // Loading
        let geoIPRequests = 0;
        let geoIPResponses = 0;

        for (let i in data) {
            let info = data[i];
            let latitude = info.latitude;
            let longitude = info.longitude;
            let scanUrl = info.target;
            let scanPing = info.scan_ping;
            let scanIP = info.scan_ip;
            let scanTTL = info.scan_ttl;
            let traceroute = info.scan_trace;

            // In case of a failed traceroute, we won't have any traces
            if (traceroute === undefined) {
                continue;
            }

            let userLocation = new google.maps.LatLng(info.latitude, info.longitude); // First location

            this._setColor(userLocation, scanIP, scanPing);

            let trace_output = "";
            let orderedNodes = [];
            let geoIP = new GeoIP();

            for (let j in traceroute) {
                let ip = traceroute[j].ip;
                let ping = traceroute[j].ping;
                let ttl = traceroute[j].ttl;

                trace_output += "[" + ttl + "] " + ip + " (" + ping + "ms)<br/>"; // Build output

                // Search inside IP's location we already got
                if (ip !== "*") {
                    orderedNodes.push(ip);

                    geoIPRequests += 1;
                    geoIP.localize(ip, function () {
                        // Loading feedback
                        geoIPResponses += 1;
                        that._updateAdvancement(geoIPRequests, geoIPResponses);
                    });
                }
            }

            geoIP.onAsyncFinished(function (localizedNodes) {
                let contentString =
                    "<h4>Geolocalisation</h4><p>Latitude : " + latitude + "<br/>Longitude : " + longitude + "</p>" +
                    "<h4>Scan</h4><p>Target : " + scanUrl + "<br/>Latency : " + scanPing + " ms" +
                    "<br/>TTL max : " + scanTTL + "<br/>Traceroute :<br/>" + trace_output + "</p>";

                let nodesSet = {};
                for (let index in localizedNodes) {
                    Object.assign(nodesSet, localizedNodes[index]);
                }

                that._drawServerNodes(userLocation, orderedNodes, nodesSet, contentString);
            });
        }
        this._clusteringMarkers(this._usersLocations);
    }

    /**
     * Update the localization request advancement.
     *
     * @param requests The number of started requests.
     * @param responses The number of resolved requests.
     * @private
     */
    _updateAdvancement(requests, responses) {
        let currentPercentage = Math.round((responses / requests) * 100);
        this.configuration.loadingElement.text(currentPercentage + "%");
        if (currentPercentage === 100) {
            this.configuration.loadingElement.text("Reload");
        }
    }

    /**
     * Draw the traceroute in order from userLocation to the end of orderedNodes.
     * This uses localizedNodes to print each nodes at the right location.
     * Finally, it assigns the contentString to the initial userLocation.
     *
     * @param userLocation The initial traceroute location.
     * @param orderedNodes The traversed servers' IP.
     * @param localizedNodes The servers IP - localization mapping.
     * @param contentString The traceroute data to print.
     * @private
     */
    _drawServerNodes(userLocation, orderedNodes, localizedNodes, contentString) {
        let drawRequest = [userLocation];
        let ip;
        for (let index in orderedNodes) {
            ip = orderedNodes[index];
            if (ip in localizedNodes) {
                drawRequest.push(localizedNodes[ip]);
            }
        }

        let user = this._createUserMarker(userLocation, contentString);
        this._usersLocations.push(user);
        this._createFinalRouterMarker(drawRequest.slice(-1)[0]); // Final router coordinates
        for (let coordinates in drawRequest.slice(1, -1)) {
            this._createRouterMarker(drawRequest[coordinates])
        }
        this._drawRequestsPath(drawRequest,
            this._retrieveColor(userLocation, orderedNodes.slice(-1)[0])); // Final router IP
    }

    /**
     *
     * @param markersToClusterize
     * @private
     */
    _clusteringMarkers(markersToClusterize) {
        let mcOptions = {
            gridSize: 50,
            maxZoom: 7,
            imagePath: 'https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/images/m'
        };
        new MarkerClusterer(this._map, markersToClusterize, mcOptions); // Create cluster map
    }

    /**
     * Create a traceroute start point with its data.
     *
     * @param coordinates The start coordinates.
     * @param infoContent Data about the traceroute.
     * @return {google.maps.Marker} The created user marker.
     * @private
     */
    _createUserMarker(coordinates, infoContent) {
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            title: 'Performances monitoring'
        });
        let infowindow = new google.maps.InfoWindow({
            content: infoContent
        });
        let that = this;
        google.maps.event.addListener(marker, 'click', function () {
            if (this._lastInfoWindow) {
                this._lastInfoWindow.close();
            }
            infowindow.open(that._map, marker);
            this._lastInfoWindow = infowindow; // Keep track of the last infoWindow
        });
        this._markers.push(marker);
        return marker;
    }

    /**
     * Create a Router marker on the map
     *
     * @param coordinates
     * @private
     */
    _createRouterMarker(coordinates) {
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            icon: "https://cdn2.iconfinder.com/data/icons/gnomeicontheme/32x32/places/gnome-fs-server.png", // Router
            title: 'Router'
        });
        this._markers.push(marker);
    }

    /**
     * Create a server marker on the map.
     *
     * @param coordinates
     * @private
     */
    _createFinalRouterMarker(coordinates) {
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            icon: "https://cdn3.iconfinder.com/data/icons/fatcow/32x32/server_lightning.png", // Star
            title: 'Final server'
        });
        this._markers.push(marker);
    }

    /**
     * Draw a path between each LatLng object in coordinates array
     *
     * @param coordinates The list of coordinated to draw.
     * @param color The line color to use.
     * @private
     */
    _drawRequestsPath(coordinates, color) {
        let flightPath = new google.maps.Polyline({
            path: coordinates,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: this.configuration.strokeOpacity,
            strokeWeight: this.configuration.strokeWeight
        });

        flightPath.setMap(this._map);
        this._lines.push(flightPath);
    }

    _setColor(userLocation, scanIP, scanPing) {
        if (this._colors[userLocation] === undefined) {
            this._colors[userLocation] = {};
        }
        this._colors[userLocation][scanIP] = TracerouteMap._getPerformanceColor(scanPing);
    }

    _retrieveColor(userLocation, scanIP) {
        return this._colors[userLocation][scanIP];
    }

    static _getPerformanceColor(ping) {
        // If the ping is under 1000 we use the proportional color, else we set to bad result.
        let value = ping < 1000 ? ping / 1000 : 1;
        //value from 0 to 1
        const hue = ((1 - value) * 120).toString(10);
        return ["hsl(", hue, ",100%,50%)"].join("");
    }
}