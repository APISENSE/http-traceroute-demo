(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Apisense = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict';

module.exports = function () {

    function Crop(id) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        this.id = id;
        this.settings = {
            honeycomb: "https://honeycomb.apisense.io/"
        };
        this.cropData = [];

        if (options !== undefined || options !== null) {
            if ('honeycomb' in options) {
                this.settings.honeycomb = options.honeycomb;
            }
            if ('accessKey' in options) {
                this.settings.accessKey = options.accessKey;
            }
            if ('filter' in options) {
                this.settings.filter = options.filter;
            }
        }
        return this;
    }

    var getCropData = function getCropData(url, accessKey, callback) {
        getCropDataPages(url, accessKey, 0, [], callback);
    };

    var getCropDataPages = function getCropDataPages(url, accessKey, page, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url + "?page=" + page, true);
        if (accessKey) {
            xhr.setRequestHeader('Authorization', 'accessKey ' + accessKey);
        }
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                var pageData = JSON.parse(xhr.responseText);
                if (pageData.length === 0) {
                    callback(data);
                } else {
                    getCropDataPages(url, accessKey, page + 1, data.concat(pageData), callback);
                }
            }
        };
        xhr.onerror = function (e) {
            console.error(xhr.statusText);
        };
        xhr.send(null);
    };

    Crop.prototype = {
        getDataUrl: function getDataUrl() {
            if (this.settings.filter) {
                return this.settings.honeycomb + "api/v1/crop/" + this.id + "/data/" + this.settings.filter;
            } else {
                return this.settings.honeycomb + "api/v1/crop/" + this.id + "/data";
            }
        },
        getRecords: function getRecords(callback) {
            var _this = this;

            var crop = this;
            return new Promise(function (resolve, reject) {
                if (crop.cropData.length === 0) {
                    return getCropData(crop.getDataUrl(), crop.settings.accessKey, function (data) {
                        if (_this.settings.filter) {
                            //if filter: return data
                            crop.cropData = data;
                        } else {
                            //else: raw data => extract records
                            for (var i = 0; i < data.length; i++) {
                                var body = data[i].body;
                                for (var k = 0; k < body.length; k++) {
                                    crop.cropData.push(body[k]);
                                }
                            }
                        }
                        resolve(crop.cropData);
                    });
                } else {
                    resolve(crop.cropData);
                }
            });
        }
    };

    return Crop;
}();

},{}],3:[function(require,module,exports){
'use strict';

module.exports = {
    Crop: require('crop.js'),
    Visualization: require('visualization.js')
};

},{"crop.js":2,"visualization.js":5}],4:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function () {
    var Validator = {};

    var validFormatters = ['DATE_FORMAT'];

    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function sortByX(a, b) {
        return a.x - b.x;
    }

    // Formats  {dataSetId: [{x:value, y:value}], ...}
    //          {dataSetId: {xValue:yValue, ...}, ...}"
    Validator.validateData = function (data) {
        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) != 'object') {
            throw new Error('Invalid data format');
        }
        var validatedDatasets = [];
        Object.keys(data).forEach(function (key) {
            var dataset = data[key];
            if (Array.isArray(dataset)) {
                for (var i = 0; i < dataset.length; i++) {
                    var obj = data[key][i];
                    if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) != 'object' || !('x' in obj) || !('y' in obj) || obj.x === undefined || obj.y === undefined || !isNumeric(obj.x) || !isNumeric(obj.y)) {
                        throw new Error('Invalid data format');
                    }
                }
                validatedDatasets.push({
                    id: key,
                    data: dataset.sort(sortByX)
                });
            } else {
                var _dataset = [];
                var keys = Object.keys(dataset); // return array of string

                for (var _i = 0; _i < keys.length; _i++) {
                    var x = keys[_i];
                    var y = dataset[x];
                    if (y === undefined || !isNumeric(x) || !isNumeric(y)) {
                        throw new Error('Invalid data format');
                    }
                    _dataset.push({
                        x: parseInt(x),
                        y: y
                    });
                }

                validatedDatasets.push({
                    id: key,
                    data: _dataset.sort(sortByX)
                });
            }
        });

        return validatedDatasets;
    };

    Validator.validateLabels = function (labels) {
        var validatedLabels = {};

        if ((typeof labels === 'undefined' ? 'undefined' : _typeof(labels)) != 'object') {
            throw new Error('Invalid data format');
        }

        for (var key in labels) {
            if (key == 'xAxis') {
                if (typeof labels.xAxis == 'string' && validFormatters.includes(labels.xAxis) || _typeof(labels.xAxis) == 'object') {
                    validatedLabels.xAxis = labels.xAxis;
                } else {
                    throw new Error('Invalid data format');
                }
            } else if (key == 'yAxis') {
                if (typeof labels.yAxis == 'string' && validFormatters.includes(labels.yAxis) || _typeof(labels.yAxis) == 'object') {
                    validatedLabels.yAxis = labels.yAxis;
                } else {
                    throw new Error('Invalid data format');
                }
            } else if (typeof labels[key] == 'string') {
                validatedLabels[key] = labels[key];
            } else {
                throw new Error('Invalid data format');
            }
        }

        return validatedLabels;
    };

    Validator.validateColors = function (colors) {
        var colorPattern = /(^#?[0-9A-F]{6}$)|(^#?[0-9A-F]{8}$)|(^#?[0-9A-F]{3}$)/i;
        var validatedColors = {};

        if ((typeof colors === 'undefined' ? 'undefined' : _typeof(colors)) != 'object') {
            throw new Error('Invalid data format');
        }

        for (var key in colors) {
            var datasetColor = colors[key];
            if (typeof datasetColor == 'string' && colorPattern.test(datasetColor)) {
                validatedColors[key] = datasetColor;
            } else if ((typeof datasetColor === 'undefined' ? 'undefined' : _typeof(datasetColor)) == 'object') {
                validatedColors[key] = {};
                for (var value in datasetColor) {
                    if (colorPattern.test(datasetColor[value])) {
                        validatedColors[key][value] = datasetColor[value];
                    } else {
                        throw new Error('Invalid data format');
                    }
                }
            } else {
                throw new Error('Invalid data format');
            }
        }

        return validatedColors;
    };

    return Validator;
}();

},{}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function () {

    var Chart = require('chart.js');
    Chart = typeof Chart === 'function' ? Chart : window.Chart;

    if (!Chart) {
        throw new Error('Apisense - Chart.js could not be found! You must include it before Apisense');
    }

    var visMod = {};

    var Validator = require('validator.js');

    var sortByX = function sortByX(a, b) {
        return a.x - b.x;
    };

    var defaultR = '176';
    var defaultG = '190';
    var defaultB = '197';
    var defaultOpacity = 0.3;

    var getRGBAColor = function getRGBAColor(hex) {
        var a = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOpacity;

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        var pHex = result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {
            r: defaultR,
            g: defaultG,
            b: defaultB
        };
        return 'rgba(' + pHex.r + ',' + pHex.g + ',' + pHex.b + ',' + a + ')';
    };

    var getChartConfig = function getChartConfig(_type, _datasets, _colors, _labels, title) {
        var ret = {
            type: _type,
            data: {},
            options: {}
        };

        if (_type == 'line' || _type == 'bar') {
            ret.options.scales = {
                xAxes: [{
                    type: 'linear'
                }],
                yAxes: [{
                    type: 'linear'
                }]
            };
        }

        if (title) {
            ret.options.title = {
                display: true,
                text: title
            };
        }

        var xValues = void 0;

        if ('xAxis' in _labels) {
            if (_labels.xAxis == 'DATE_FORMAT') {
                ret.options.scales.xAxes[0].type = 'time';
            }
            if (_typeof(_labels.xAxis) == 'object') {
                var labels = [];
                var xSet = new Set();
                for (var i = 0; i < _datasets.length; i++) {
                    var dataset = _datasets[i].data;
                    for (var j = 0; j < dataset.length; j++) {
                        xSet.add(dataset[j].x);
                    }
                }

                xValues = Array.from(xSet).sort();

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = xValues[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var item = _step.value;

                        var label = _labels.xAxis[item];
                        labels.push(label ? label : item);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                ret.data.labels = labels;
                if (_type == 'line' || _type == 'bar') {
                    ret.options.scales.xAxes = undefined;
                }
            }
        } else if (_type == 'pie') {
            var _labels2 = [];
            var _xSet = new Set();
            for (var _i = 0; _i < _datasets.length; _i++) {
                var _dataset = _datasets[_i].data;
                for (var _j = 0; _j < _dataset.length; _j++) {
                    _xSet.add(_dataset[_j].x);
                }
            }

            xValues = Array.from(_xSet).sort();
            ret.data.labels = xValues;
        }

        var datasets = [];

        for (var _i2 = 0; _i2 < _datasets.length; _i2++) {
            var _dataset2 = _datasets[_i2];
            var data = _datasets[_i2].data.sort(sortByX);

            var options = {
                label: _dataset2.id,
                backgroundColor: getRGBAColor(""),
                borderColor: getRGBAColor("", 1),
                borderWidth: 1
            };

            if (xValues) {
                xValues.sort(function (a, b) {
                    return a - b;
                });
                var dataByLabel = [];
                var index = 0;
                for (var _j2 = 0; _j2 < xValues.length; _j2++) {
                    if (index < data.length && data[index].x == xValues[_j2]) {
                        dataByLabel.push(data[index].y);
                        index++;
                    } else {
                        dataByLabel.push(null);
                    }
                }
                options.data = dataByLabel;
                options.spanGaps = true;
            } else {
                options.data = data;
            }

            if (_dataset2.id in _labels) {
                options.label = _labels[_dataset2.id];
            }

            if (_dataset2.id in _colors) {
                if (typeof _colors[_dataset2.id] == 'string') {
                    options.backgroundColor = getRGBAColor(_colors[_dataset2.id]);
                    options.borderColor = getRGBAColor(_colors[_dataset2.id], 1);
                }
                if (_typeof(_colors[_dataset2.id]) == 'object') {
                    options.backgroundColor = [];
                    options.borderColor = [];
                    options.borderWidth = [];

                    if (xValues) {
                        for (var _index in xValues) {
                            var color = _colors[_dataset2.id][xValues[_index]];
                            options.backgroundColor.push(getRGBAColor(color));
                            options.borderColor.push(getRGBAColor(color, 1));
                            options.borderWidth.push(1);
                        }
                    } else {
                        for (var point in data) {
                            var _color = _colors[_dataset2.id][point.x];
                            options.backgroundColor.push(getRGBAColor(_color));
                            options.borderColor.push(getRGBAColor(_color, 1));
                            options.borderWidth.push(1);
                        }
                    }
                }
            }

            datasets.push(options);
        }

        ret.data.datasets = datasets;
        ret.options.showLines = true;

        return ret;
    };

    var ChartWrapper = function ChartWrapper() {
        var wrapper = {};
        var data = [];
        var labels = {};
        var colors = {};
        // DATA
        wrapper.getData = function () {
            return data;
        };
        wrapper.setData = function (_data) {
            data = Validator.validateData(_data);
        };
        // LABELS
        wrapper.getLabels = function () {
            return labels;
        };
        wrapper.setLabels = function (_labels) {
            labels = Validator.validateLabels(_labels);
        };
        // COLORS
        wrapper.getColors = function () {
            return colors;
        };
        wrapper.setColors = function (_colors) {
            colors = Validator.validateColors(_colors);
        };
        return wrapper;
    };

    //visible to mock in test
    visMod._newChart = function (ctx, config) {
        return new Chart(ctx, config);
    };

    var getChartPromise = function getChartPromise(type, ctx, crop, title, initCallback) {
        return new Promise(function (resolve, reject) {
            crop.getRecords().then(function (cropData) {
                var wrapper = ChartWrapper();
                initCallback(wrapper, cropData);
                var config = getChartConfig(type, wrapper.getData(), wrapper.getColors(), wrapper.getLabels(), title);
                resolve(visMod._newChart(ctx, config));
            });
        });
    };

    visMod.addLineChart = function (ctx, crop, title, initCallback) {
        return getChartPromise('line', ctx, crop, title, initCallback);
    };

    visMod.addBarChart = function (ctx, crop, title, initCallback) {
        return getChartPromise('bar', ctx, crop, title, initCallback);
    };

    visMod.addPieChart = function (ctx, crop, title, initCallback) {
        return getChartPromise('pie', ctx, crop, title, initCallback);
    };

    return visMod;
}();

},{"chart.js":1,"validator.js":4}]},{},[3])(3)
});