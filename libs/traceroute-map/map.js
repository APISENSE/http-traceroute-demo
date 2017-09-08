/**
 * Create a Google Map handling traceroutes data from APISENSE.
 *
 * The color on the map are mapped onto the ping result
 * where 0 will be displayed in green and 1000+ in red.
 *
 * Please ensure to load Google Map API before initializing this class:
 * <script src="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=visualization&callback=initTraceroutePlot"></script>
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
        this._usersMarkers = [];
        this._endpointsMarkers = [];
        this._traceroutesMarkers = [];
        this._colors = {};
        this.reloadGoogleMap() // Initialize this._map
    }

    /**
     * Reload the Google Map instance with the new configuration.
     */
    reloadGoogleMap() {
        this._map = this._initializeUnderlying();
        let clusterOptions = {
            gridSize: 50,
            maxZoom: 7,
            imagePath: 'https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/images/m'
        };
        this._clusterHandler = new MarkerClusterer(this._map, [], clusterOptions);
    }

    /**
     * Reset the map to show nothing.
     *
     * @private
     */
    _clearMap() {
        for (let i = 0; i < this._traceroutesMarkers.length; i++) {
            this._removeMarkersList(this._traceroutesMarkers[i]);
        }

        this._usersMarkers = [];
        this._endpointsMarkers = [];
        this._traceroutesMarkers = [];
        this._colors = {};
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
            let scanTTL = info.scan_ttl;
            let traceroute = info.scan_trace;

            // In case of a failed traceroute, we won't have any traces
            if (traceroute === undefined) {
                continue;
            }

            let userLocation = new google.maps.LatLng(info.latitude, info.longitude); // First location
            let finalRouterPing = traceroute[traceroute.length - 1].ping;
            let finalRouterIP = traceroute[traceroute.length - 1].ip;
            this._setColor(userLocation, finalRouterIP, finalRouterPing);

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
                    "<h4>Scan</h4><p>Target : " + scanUrl + "<br/>Latency : " + finalRouterPing + " ms" +
                    "<br/>TTL max : " + scanTTL + "<br/>Traceroute :<br/>" + trace_output + "</p>";

                let nodesSet = {};
                for (let index in localizedNodes) {
                    Object.assign(nodesSet, localizedNodes[index]);
                }

                let serverPath = TracerouteMap._computeNodePath(userLocation, orderedNodes, nodesSet);
                let color = that._retrieveColor(userLocation, orderedNodes.slice(-1)[0]);

                that._drawServerNodes(serverPath, color, contentString);
                that._clusterHandler.redraw()
            });
        }
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
     * Create an array of location representing the current traceroute.
     *
     * @param userLocation The initial location.
     * @param orderedNodes The list of encountered nodes, in order.
     * @param localizedNodes The mapping between the nodes and their location.
     * @return {[]} An array of location.
     * @private
     */
    static _computeNodePath(userLocation, orderedNodes, localizedNodes) {
        let nodePath = [userLocation];
        for (let index in orderedNodes) {
            let ip = orderedNodes[index];
            if (ip in localizedNodes) {
                nodePath.push(localizedNodes[ip]);
            }
        }
        return nodePath;
    }

    /**
     * Draw the traceroute in order from userLocation to the end of orderedNodes.
     * This uses localizedNodes to print each nodes at the right location.
     * Finally, it assigns the contentString to the initial userLocation.
     *
     * @param drawRequest The set of server to draw.
     * @param color Color of the path to draw.
     * @param contentString The traceroute data to print.
     * @private
     */
    _drawServerNodes(drawRequest, color, contentString) {
        let tracerouteMarkers = [];

        // Create start point
        let user = this._createUserMarker(drawRequest[0], contentString);
        tracerouteMarkers.push(user);
        this._usersMarkers.push(user);

        // Create endpoint
        let marker = this._createFinalRouterMarker(drawRequest.slice(-1)[0], contentString); // Final router coordinates
        tracerouteMarkers.push(marker);
        this._endpointsMarkers.push(marker);

        // Create intermediary routers
        let nodes = drawRequest.slice(1, -1);
        for (let i = 0; i < nodes.length; i++) {
            marker = this._createRouterMarker(nodes[i], i, contentString);
            tracerouteMarkers.push(marker);
            this._clusterHandler.addMarker(marker);
        }

        // Draw route using final
        let path = this._drawRequestsPath(drawRequest, color, contentString);
        tracerouteMarkers.push(path);

        this._traceroutesMarkers.push(tracerouteMarkers);
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
        console.log("Printing start point");
        console.log(coordinates.lat() + " - " + coordinates.lng());
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            title: 'Performances monitoring'
        });
        this._addContentPopup(marker, infoContent);
        return marker;
    }

    /**
     * Create a Router marker on the map
     *
     * @param coordinates The server coordinates.
     * @param index The index to put as label.
     * @param infoContent Data about the traceroute.
     * @return {google.maps.Marker} The created router marker.
     * @private
     */
    _createRouterMarker(coordinates, index, infoContent) {
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            label: (index + 1).toString(),
            icon: "https://cdn2.iconfinder.com/data/icons/gnomeicontheme/32x32/places/gnome-fs-server.png",
            title: 'Router'
        });
        this._addContentPopup(marker, infoContent);
        return marker;
    }

    /**
     * Create a server marker on the map.
     *
     * @param coordinates The endpoint coordinates.
     * @param infoContent The content to print for this traceroute.
     * @return {google.maps.Marker} The created final router marker.
     * @private
     */
    _createFinalRouterMarker(coordinates, infoContent) {
        let marker = new google.maps.Marker({
            position: coordinates,
            map: this._map,
            icon: "https://cdn3.iconfinder.com/data/icons/fatcow/32x32/server_lightning.png", // Star
            title: 'Final server'
        });
        this._addContentPopup(marker, infoContent);
        return marker;
    }

    /**
     * Draw a path between each LatLng object in coordinates array
     *
     * @param coordinates The list of coordinates to draw.
     * @param color The line color to use.
     * @param infoContent The content to print for this traceroute.
     * @return {google.maps.Polyline} The path reference.
     * @private
     */
    _drawRequestsPath(coordinates, color, infoContent) {
        let flightPath = new google.maps.Polyline({
            path: coordinates,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: this.configuration.strokeOpacity,
            strokeWeight: this.configuration.strokeWeight
        });

        flightPath.setMap(this._map);
        this._addContentPopup(flightPath, infoContent);
        // this._lines.push(flightPath);
        return flightPath;
    }

    /**
     * Define a color for the given ping and associate it to the userLocation and scanIP pair.
     *
     * @param userLocation The starting location for this traceroute.
     * @param scanIP The endpoint IP for this traceroute.
     * @param scanPing The traceroute ping, to determine color.
     * @private
     */
    _setColor(userLocation, scanIP, scanPing) {
        if (this._colors[userLocation] === undefined) {
            this._colors[userLocation] = {};
        }
        this._colors[userLocation][scanIP] = TracerouteMap._getPerformanceColor(scanPing);
    }

    /**
     * Return the created color input for the given userLocation and scanIP pair.
     *
     * @param userLocation The starting location for this traceroute.
     * @param scanIP The endpoint IP for this traceroute.
     * @return {*} The defined color.
     * @private
     */
    _retrieveColor(userLocation, scanIP) {
        return this._colors[userLocation][scanIP];
    }

    /**
     * Return a HSL color depending on the given ping.
     * The color changes from green to red along with a ping from 0 to 1000.
     *
     * @param ping The ping to retrieve a color from.
     * @return {string} The HSL color definition
     * @private
     */
    static _getPerformanceColor(ping) {
        // If the ping is under 1000 we use the proportional color, else we set to bad result.
        let value = ping < 1000 ? ping / 1000 : 1;
        //value from 0 to 1
        const hue = ((1 - value) * 120).toString(10);
        return ["hsl(", hue, ",100%,50%)"].join("");
    }


    /**
     * Create a popup on the given map element with the content inside.
     * This popup will hide every other traceroute, enabling to focus on the clicked one,
     * and restore them after closing it.
     *
     * @param element The element to add a popup to.
     * @param content The popup content.
     * @private
     */
    _addContentPopup(element, content) {
        let that = this;
        let infowindow = new google.maps.InfoWindow({
            content: content
        });

        google.maps.event.addListener(infowindow, 'closeclick', function () {
            that._restoreMarkers();
        });

        google.maps.event.addListener(element, 'click', function () {
            if (that._lastInfoWindow) {
                that._lastInfoWindow.close();
            }
            infowindow.open(that._map, element);
            that._lastInfoWindow = infowindow; // Keep track of the last infoWindow

            for (let i = 0; i < that._traceroutesMarkers.length; i++) {
                let traceroute = that._traceroutesMarkers[i];
                if (!traceroute.includes(element)) {
                    that._removeMarkersList(traceroute);
                }
            }
        });
    }

    /**
     * Reset the current map to every traceroutes.
     *
     * @private
     */
    _restoreMarkers() {
        for (let i = 0; i < this._traceroutesMarkers.length; i++) {
            this._restoreMarkersList(this._traceroutesMarkers[i]);
        }
    }

    /**
     * Restore the elements of the list on the map and clusters.
     *
     * @param list The list of markers to update.
     * @private
     */
    _restoreMarkersList(list) {
        for (let i = 0; i < list.length; i++) {
            let marker = list[i];
            marker.setMap(this._map);

            if (this._isValidIntermediaryNode(marker)) {
                this._clusterHandler.addMarker(marker);
            }
        }
        this._clusterHandler.redraw()
    }

    /**
     * We need a marker which is not an endpoint nor an user.
     *
     * @param marker The marker to test.
     * @return {boolean} True if the marker is a node, false otherwise.
     * @private
     */
    _isValidIntermediaryNode(marker) {
        // getPosition ensure that we have a marker and not a Polyline.
        return marker.getPosition !== undefined
            && !this._usersMarkers.includes(marker)
            && !this._endpointsMarkers.includes(marker)
    }

    /**
     * Remove the elements of the list from the map and clusters.
     *
     * @param list The list of markers to update.
     * @private
     */
    _removeMarkersList(list) {
        for (let i = 0; i < list.length; i++) {
            let marker = list[i];
            marker.setMap(null);
            this._clusterHandler.removeMarker(marker);
        }
        this._clusterHandler.redraw()
    }
}