let crop = new Apisense.Crop("kzOZK30R04i9wlE5v0KE", {});


let endpointDistributionCtxt = document.getElementById("endpoints-distribution").getContext('2d');
Apisense.Visualization.addPieChart(endpointDistributionCtxt, crop, "Number of request for each endpoint", (chart, data) => {
    let targetIndex = {};
    let dataset = {};

    for (let i = 0; i < data.length; i++) {
        let target = data[i].target;

        targetIndex = addTargetIfMissing(targetIndex, target);
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

    for (let i = 0; i < data.length; i++) {
        let ttl = data[i].scan_ttl;
        if (ttl === undefined) {
            continue;
        }

        dataset = countOccurrences(dataset, ttl);
    }

    chart.setData({dataset: dataset});
    chart.setLabels({dataset: "Number of occurrences"});
    chart.setColors({dataset: getRandomColor()});
});

let hopsDistributionCtxt = document.getElementById("hops-distribution").getContext('2d');
Apisense.Visualization.addBarChart(hopsDistributionCtxt, crop, "Distribution of intermediary endpoints", (chart, data) => {
    let dataset = {};
    let indexSet = {};

    console.log(data); // TODO fill a bug
    for (let i = 0; i < data.length; i++) {
        let traceroute = data[i].scan_trace;
        let target = data[i].target;
        if (traceroute === undefined || target === undefined) {
            continue;
        }

        let targetSet = dataset[target] !== undefined ? dataset[target] : {};
        // let targetIndex = indexSet[target] !== undefined ? indexSet[target] : {};
        for (let j = 0; j < traceroute.length; j++) {
            let host = /*traceroute[j].hostname !== undefined ? traceroute[j].hostname :*/ traceroute[j].ip;
            indexSet = addTargetIfMissing(indexSet, host);
            let index = indexSet[host];
            targetSet = countOccurrences(targetSet, index);
        }
        dataset[target] = targetSet;
        // indexSet[target] = targetIndex;
    }

    // let labels = {};
    let colors = {};
    for (let targetName in dataset) {
        colors[targetName] = getRandomColor();
    }
    console.log(dataset);
    console.log(indexSet);
console.log("---");
    // console.log(labels);
    console.log(colors);
    chart.setData(dataset);
    chart.setLabels({xAxis: swapIndex(indexSet)});
    chart.setColors(colors);
});

function addTargetIfMissing(targetIndex, target) {
    let index = targetIndex[target];

    if (index === undefined) {
        index = Object.keys(targetIndex).length;
        targetIndex[target] = index;
    }
    return targetIndex;
}

function countOccurrences(dataset, item) {
    let occurrencesTarget = dataset[item];
    // We don't have had any occurrences of this target before
    if (dataset[item] === undefined) {
        occurrencesTarget = 0;
    }
    dataset[item] = occurrencesTarget + 1;
    return dataset;
}

function swapIndex(json) {
    let ret = {};
    for (let key in json) {
        ret[json[key]] = key;
    }
    return ret;
}

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}