class GeoIP {
    constructor() {
        this._locationCache = {};
        this._calls = [];
    }

    /**
     * Try to localize the given IP and execute the callback when found.
     * The lookup will first try to use a localization cache,
     * and call a GeoIP service if not found locally.
     *
     * @param ip The IP to localize.
     * @param callback The callback to execute.
     */
    localize(ip, callback) {
        let that = this;
        this._calls.push(new Promise(function (resolve, reject) {
            if (ip in that._locationCache) {
                let latlng = that._locationCache[ip];
                GeoIP._resolveLocationFound(callback, resolve, ip, latlng);
            } else {
                that._callGeoIPService(ip, function (latlng) {
                    GeoIP._resolveLocationFound(callback, resolve, ip, latlng);
                })
            }
        }));
    }

    /**
     * Execute callback when all localization are finished.
     * Then initialize the class for a new localization round.
     *
     * @param callback The callback to execute.
     */
    onAsyncFinished(callback) {
        Promise.all(this._calls).then(callback, GeoIP._onError);
        this.initializeLookup();
    }

    /**
     * Reset the GeoIP class state to a new traceroute lookup.
     */
    initializeLookup() {
        this._calls = [];
    }

    _callGeoIPService(ip, callback) {
        let that = this;
        $.getJSON("https://freegeoip.net/json/" + ip, function (data) {
            let latlng = new google.maps.LatLng(data.latitude, data.longitude);
            that._locationCache[ip] = latlng;
            callback(latlng);
        });
    }

    /**
     * Print error message if any asynchronous task goes wrong.
     * @private
     */
    static _onError(e) {
        console.log("An error occurred while retrieving servers locations. (" + e + ")")
    }

    /**
     * Set the location, if valid, to the current result set.
     *
     * @param callback
     * @param resolve
     * @param ip The localized IP.
     * @param latlng The server localization.
     * @private
     */
    static _resolveLocationFound(callback, resolve, ip, latlng) {
        callback(latlng);
        if (GeoIP.isValidLocation(latlng)) {
            resolve({[ip]: latlng});
        } else {
            resolve({});
        }
    }

    /**
     * Check if the location if valid, i.e. not equal to (0,0).
     *
     * @param coordinates
     */
    static isValidLocation(coordinates) {
        return coordinates.lat() !== 0 && coordinates.lng() !== 0;
    }

}