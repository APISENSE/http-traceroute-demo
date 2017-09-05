/**
 * Create charts about the given traceroutes data.
 */
class TracerouteCharts {
    constructor(crop) {
        this._crop = crop;
        this._chartsPromises = [];
    }

    /**
     * Remove all currently drawn charts.
     */
    clearCharts() {
        Promise.all(this._chartsPromises).then(function (charts) {
            for (let index in charts) {
                charts[index].destroy()
            }
        });
        this._chartsPromises = [];
    }

    /**
     * Draw the defined charts about traceroute.
     *
     * @param filteredData Force usage to this dataset if defined, otherwise the crop will be queried.
     */
    loadCharts(filteredData) {
        let that = this;

        let endpointDistributionCtxt = document.getElementById("endpoints-distribution").getContext('2d');
        this._chartsPromises.push(Apisense.Visualization.addPieChart(endpointDistributionCtxt, this._crop,
            "Number of request for each endpoint", (chart, records) => {
                let data = filteredData !== undefined ? filteredData : records;
                let targetIndex = {};
                let dataset = {};

                for (let i = 0; i < data.length; i++) {
                    let target = data[i].target;

                    TracerouteCharts._addTargetIfMissing(targetIndex, target);
                    let index = targetIndex[target];
                    TracerouteCharts._countOccurrences(dataset, index);
                }

                let labels = TracerouteCharts._swapIndex(targetIndex);
                let colors = {};
                for (let index in labels) {
                    colors[index] = TracerouteCharts._getRandomColor();
                }

                chart.setData({dataset: dataset});
                chart.setLabels({xAxis: labels});
                chart.setColors({dataset: colors});
            }));

        let hopsOccurrencesCtxt = document.getElementById("hops-occurrences").getContext('2d');
        this._chartsPromises.push(Apisense.Visualization.addLineChart(hopsOccurrencesCtxt, this._crop,
            "Number of jumps to access endpoint", (chart, records) => {
                let data = filteredData !== undefined ? filteredData : records;
                let dataset = {};

                for (let i = 0; i < data.length; i++) {
                    let ttl = data[i].scan_ttl;
                    if (ttl === undefined) {
                        continue;
                    }

                    TracerouteCharts._countOccurrences(dataset, ttl);
                }

                chart.setData({dataset: dataset});
                chart.setLabels({dataset: "Number of occurrences"});
                chart.setColors({dataset: TracerouteCharts._getRandomColor()});
            }));

        let hopsDistributionCtxt = document.getElementById("hops-distribution").getContext('2d');
        this._chartsPromises.push(Apisense.Visualization.addBarChart(hopsDistributionCtxt, this._crop,
            "Distribution of intermediary endpoints", (chart, records) => {
                let data = filteredData !== undefined ? filteredData : records;
                let dataset = {};
                let indexSet = {};

                for (let i = 0; i < data.length; i++) {
                    let traceroute = data[i].scan_trace;
                    let target = data[i].target;
                    if (traceroute === undefined || target === undefined) {
                        continue;
                    }

                    let targetSet = dataset[target] !== undefined ? dataset[target] : {};
                    for (let j = 0; j < traceroute.length; j++) {
                        let host = traceroute[j].ip;
                        TracerouteCharts._addTargetIfMissing(indexSet, host);
                        let index = indexSet[host];
                        TracerouteCharts._countOccurrences(targetSet, index);
                    }
                    dataset[target] = targetSet;
                }

                let colors = {};
                for (let targetName in dataset) {
                    colors[targetName] = TracerouteCharts._getRandomColor();
                }

                chart.setData(dataset);
                chart.setLabels({xAxis: TracerouteCharts._swapIndex(indexSet)});
                chart.setColors(colors);
            }));

        let pingPerTTLCtxt = document.getElementById("ping-ttl").getContext('2d');
        this._chartsPromises.push(Apisense.Visualization.addLineChart(pingPerTTLCtxt, this._crop,
            "Average ping per TTL", (chart, records) => {
                let data = filteredData !== undefined ? filteredData : records;
                let dataset = {
                    all_nodes: {},
                    all_nodes_wifi: {},
                    all_nodes_gsm: {},
                    endpoints: {},
                    endpoints_wifi: {},
                    endpoints_gsm: {}
                };
                let labels = {
                    all_nodes: "All nodes",
                    all_nodes_wifi: "All nodes (WiFi)",
                    all_nodes_gsm: "All nodes (GSM)",
                    endpoints: "Endpoints",
                    endpoints_wifi: "Endpoints (WiFi)",
                    endpoints_gsm: "Endpoints (GSM)"
                };
                let colors = {
                    all_nodes: TracerouteCharts._getRandomColor(),
                    all_nodes_wifi: TracerouteCharts._getRandomColor(),
                    all_nodes_gsm: TracerouteCharts._getRandomColor(),
                    endpoints: TracerouteCharts._getRandomColor(),
                    endpoints_wifi: TracerouteCharts._getRandomColor(),
                    endpoints_gsm: TracerouteCharts._getRandomColor()
                };

                for (let i = 0; i < data.length; i++) {
                    let traceroute = data[i].scan_trace;
                    let finalIP = data[i].scan_ip;
                    let network = data[i].network;

                    if (traceroute === undefined || finalIP === undefined) {
                        continue;
                    }

                    for (let j = 0; j < traceroute.length; j++) {
                        let host = traceroute[j].ip;
                        let ttl = traceroute[j].ttl;
                        let ping = traceroute[j].ping;
                        if (host === finalIP) {
                            TracerouteCharts._appendValue(dataset.endpoints, ttl, ping);
                            if (network === "WIFI") {
                                TracerouteCharts._appendValue(dataset.endpoints_wifi, ttl, ping);
                            } else {
                                TracerouteCharts._appendValue(dataset.endpoints_gsm, ttl, ping);
                            }
                        }
                        TracerouteCharts._appendValue(dataset.all_nodes, ttl, ping);
                        if (network === "WIFI") {
                            TracerouteCharts._appendValue(dataset.all_nodes_wifi, ttl, ping);
                        } else {
                            TracerouteCharts._appendValue(dataset.all_nodes_gsm, ttl, ping);
                        }
                    }
                }

                for (data in dataset) {
                    dataset[data] = TracerouteCharts._meanOfEachArray(dataset[data]);
                }

                chart.setData(dataset);
                chart.setLabels(labels);
                chart.setColors(colors);
            }));
    }

    /**
     * Append the given value to the array at the index of the dataset.
     * Creates a new array if needed.
     *
     * @param dataset The dataset to update
     * @param index The index to fetch the array from.
     * @param value The value to append to the retrieved array.
     */
    static _appendValue(dataset, index, value) {
        let pingArray = dataset[index] !== undefined ? dataset[index] : [];
        pingArray.push(value);
        dataset[index] = pingArray;
    }

    /**
     * Add the given target with a new index if not already contained in the index.
     *
     * @param targetIndex The index to update.
     * @param target The target to add to the index.
     */
    static _addTargetIfMissing(targetIndex, target) {
        let index = targetIndex[target];

        if (index === undefined) {
            index = Object.keys(targetIndex).length;
            targetIndex[target] = index;
        }
    }

    /**
     * Update the count of occurrences of the given item in the dataset.
     *
     * @param dataset The dataset contaning item as key and nb occurrences as value.
     * @param item The item to count.
     */
    static _countOccurrences(dataset, item) {
        let occurrencesTarget = dataset[item];
        // We don't have had any occurrences of this target before
        if (dataset[item] === undefined) {
            occurrencesTarget = 0;
        }
        dataset[item] = occurrencesTarget + 1;
    }

    /**
     * Traverse the given object and calculates the mean of each of its contained arrays.
     *
     * Warning: Every values must be arrays.
     *
     * @param arraySet The object containing only arrays as values.
     * @return {Array} The array of point {x: dataset key, y: mean value}.
     */
    static _meanOfEachArray(arraySet) {
        let dataset = [];
        for (let ttl in arraySet) {
            let sum = arraySet[ttl].reduce((a, b) => {
                return a + b;
            });
            dataset.push({x: ttl, y: sum / arraySet[ttl].length}); // Average value
        }
        return dataset;
    }

    /**
     * Invert key and value from the given Json.
     *
     * @param json The json to swap.
     * @return {{}} The swapped Json.
     */
    static _swapIndex(json) {
        let ret = {};
        for (let key in json) {
            ret[json[key]] = key;
        }
        return ret;
    }

    /**
     * Generates a random color.
     *
     * @return {string} The random RGB color e.g. "#00FF00"
     */
    static _getRandomColor() {
        let letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}