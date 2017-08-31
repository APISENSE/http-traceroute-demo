let crop = new Apisense.Crop("kzOZK30R04i9wlE5v0KE", {});


let endpointDistributionCtxt = document.getElementById("endpoints-distribution").getContext('2d');
Apisense.Visualization.addPieChart(endpointDistributionCtxt, crop, "Number of request for each endpoint", (chart, data) => {
    let targetIndex = {};
    let dataset = {};

    for (let i = 0; i < data.length; i++) {
        let target = data[i].target;

        addTargetIfMissing(targetIndex, target);
        let index = targetIndex[target];
        countOccurrences(dataset, index);
    }

    let labels = swapIndex(targetIndex);
    let colors = {};
    for (let index in labels) {
        colors[index] = getRandomColor();
    }

    chart.setData({dataset: dataset});
    chart.setLabels({xAxis: labels});
    chart.setColors({dataset: colors});
});

let hopsOccurrencesCtxt = document.getElementById("hops-occurrences").getContext('2d');
Apisense.Visualization.addLineChart(hopsOccurrencesCtxt, crop, "Number of jumps to access endpoint", (chart, data) => {
    let dataset = {};

    for (let i = 0; i < data.length / 2; i++) { // FIXME: The length is a bug: https://github.com/Inria-Chile/apisense-web-helper/issues/3
        let ttl = data[i].scan_ttl;
        if (ttl === undefined) {
            continue;
        }

        countOccurrences(dataset, ttl);
    }

    chart.setData({dataset: dataset});
    chart.setLabels({dataset: "Number of occurrences"});
    chart.setColors({dataset: getRandomColor()});
});

let hopsDistributionCtxt = document.getElementById("hops-distribution").getContext('2d');
Apisense.Visualization.addBarChart(hopsDistributionCtxt, crop, "Distribution of intermediary endpoints", (chart, data) => {
    let dataset = {};
    let indexSet = {};

    for (let i = 0; i < data.length / 3; i++) { // FIXME: The length is a bug: https://github.com/Inria-Chile/apisense-web-helper/issues/3
        let traceroute = data[i].scan_trace;
        let target = data[i].target;
        if (traceroute === undefined || target === undefined) {
            continue;
        }

        let targetSet = dataset[target] !== undefined ? dataset[target] : {};
        for (let j = 0; j < traceroute.length; j++) {
            let host = traceroute[j].ip;
            addTargetIfMissing(indexSet, host);
            let index = indexSet[host];
            countOccurrences(targetSet, index);
        }
        dataset[target] = targetSet;
    }

    let colors = {};
    for (let targetName in dataset) {
        colors[targetName] = getRandomColor();
    }

    chart.setData(dataset);
    chart.setLabels({xAxis: swapIndex(indexSet)});
    chart.setColors(colors);
});

let pingPerTTLCtxt = document.getElementById("ping-ttl").getContext('2d');
Apisense.Visualization.addLineChart(pingPerTTLCtxt, crop, "Average ping per TTL", (chart, data) => {
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
        all_nodes: getRandomColor(),
        all_nodes_wifi: getRandomColor(),
        all_nodes_gsm: getRandomColor(),
        endpoints: getRandomColor(),
        endpoints_wifi: getRandomColor(),
        endpoints_gsm: getRandomColor()
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
                appendValue(dataset.endpoints, ttl, ping);
                if (network === "WIFI") {
                    appendValue(dataset.endpoints_wifi, ttl, ping);
                } else {
                    appendValue(dataset.endpoints_gsm, ttl, ping);
                }
            }
            appendValue(dataset.all_nodes, ttl, ping);
            if (network === "WIFI") {
                appendValue(dataset.all_nodes_wifi, ttl, ping);
            } else {
                appendValue(dataset.all_nodes_gsm, ttl, ping);
            }
        }
    }

    for (data in dataset) {
        dataset[data] = meanOfEachArray(dataset[data]);
    }

    chart.setData(dataset);
    chart.setLabels(labels);
    chart.setColors(colors);
});


/**
 * Append the given value to the array at the index of the dataset.
 * Creates a new array if needed.
 *
 * @param dataset The dataset to update
 * @param index The index to fetch the array from.
 * @param value The value to append to the retrieved array.
 */
function appendValue(dataset, index, value) {
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
function addTargetIfMissing(targetIndex, target) {
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
function countOccurrences(dataset, item) {
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
function meanOfEachArray(arraySet) {
    dataset = [];
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
function swapIndex(json) {
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
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}