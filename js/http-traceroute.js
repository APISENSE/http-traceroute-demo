let crop = new Apisense.Crop("kzOZK30R04i9wlE5v0KE", {});


let endpointDistributionCtxt = document.getElementById("endpoints-distribution").getContext('2d');
let endpointsDistributionPromise = Apisense.Visualization
    .addPieChart(endpointDistributionCtxt, crop, "Number of request for each endpoint", (chart, data) => {
        let targetIndex = {};
        let dataset = {};

        for (let i = 0; i < data.length; i++) {
            let record = data[i];
            console.log(record);
            let target = record.target;
            let index = targetIndex[target];
            let occurrencesTarget = dataset[index];

            // We don't have had any occurrences of this target before
            if (targetIndex[target] === undefined) {
                occurrencesTarget = 0;
                index = Object.keys(targetIndex).length;
                targetIndex[target] = index;
            }
            dataset[index] = occurrencesTarget + 1;
        }

        let labels = swapIndex(targetIndex);
        chart.setData({dataset: dataset});
        chart.setLabels({xAxis: swapIndex(targetIndex)});


        let colors = {};
        for (let index in labels) {
            colors[index] = getRandomColor();
        }
        chart.setColors({dataset: colors});

    });

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

endpointsDistributionPromise.then((chart) => {
    console.log('Pie Chart ready');
});
